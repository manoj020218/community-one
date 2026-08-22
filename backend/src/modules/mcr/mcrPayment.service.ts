import QRCode from 'qrcode';
import { ConflictError, NotFoundError, ValidationError } from '../../common/errors/AppError';
import { logger } from '../../common/utils/logger';
import { Flat } from '../flat/flat.model';
import { FileAsset } from '../fileAsset/fileAsset.model';
import { Resident } from '../resident/resident.model';
import { User } from '../user/user.model';
import { McrActorContext } from './mcr.access.service';
import { McrPaymentRecord, IMcrPaymentRecordDocument } from './mcrPaymentRecord.model';
import { createMcrPaymentSchema, residentSubmitPaymentSchema } from './mcrPayment.schemas';
import { mcrNumberingService } from './mcrNumbering.service';
import { mcrSettingsService } from './mcrSettings.service';
import { buildUpiLink } from './mcrUpi.util';
import { parseOrThrow } from './mcr.validation';

interface PaymentInsertInput {
  flatId: string;
  residentId?: string;
  payerName: string;
  payerMobile?: string;
  amountPaise: number;
  paymentMethod: string;
  paymentDate?: Date;
  receivedDate?: Date;
  bankReference?: string;
  upiReference?: string;
  chequeNumber?: string;
  chequeDate?: Date;
  bankName?: string;
  cardReference?: string;
  cashCollectionReference?: string;
  notes?: string;
  proofFileIds: string[];
  idempotencyKey?: string;
  source: string;
}

export class McrPaymentService {
  async listBySociety(societyId: string, status?: string, towerId?: string): Promise<IMcrPaymentRecordDocument[]> {
    const query: Record<string, unknown> = { societyId };
    if (status) query.status = status;
    if (towerId) {
      const towerFlats = await Flat.find({ towerId }).select('_id');
      query.flatId = { $in: towerFlats.map((f) => f._id) };
    }
    return McrPaymentRecord.find(query)
      .sort({ receivedDate: -1, createdAt: -1 })
      .populate({ path: 'flatId', select: 'flatNo towerId', populate: { path: 'towerId', select: 'name' } })
      .populate('proofFileIds', 'url originalName mimeType');
  }

  async findById(societyId: string, paymentId: string): Promise<IMcrPaymentRecordDocument> {
    const payment = await McrPaymentRecord.findOne({ _id: paymentId, societyId }).populate('proofFileIds', 'url originalName mimeType');
    if (!payment) throw new NotFoundError('MCR payment');
    return payment;
  }

  async createManualPayment(context: McrActorContext, input: unknown): Promise<IMcrPaymentRecordDocument> {
    const dto = parseOrThrow(createMcrPaymentSchema, input);
    const flat = await Flat.findOne({ _id: dto.flatId, societyId: context.societyId });
    if (!flat) throw new NotFoundError('Flat');

    const resident = await this.findResident(context.societyId, dto.flatId, dto.residentId);
    return this.insertPayment(context, { ...dto, residentId: resident?._id?.toString(), source: 'MANUAL' });
  }

  /** Resident-initiated UPI payment submission — flat/payer are always derived from the
   * caller's own account, never from client input, so a resident can never claim a payment
   * against a flat they don't belong to. */
  async createResidentPayment(context: McrActorContext, input: unknown): Promise<IMcrPaymentRecordDocument> {
    if (!context.user.flatId) throw new ValidationError('Your account is not linked to a flat');

    const settings = await mcrSettingsService.getBySociety(context.societyId, context.user.userId);
    if (!settings.allowResidentPaymentSubmission) {
      throw new ValidationError('Resident payment submission is not enabled for this society');
    }

    const dto = parseOrThrow(residentSubmitPaymentSchema, input);
    const flat = await Flat.findOne({ _id: context.user.flatId, societyId: context.societyId });
    if (!flat) throw new NotFoundError('Flat');

    const resident = await this.findResident(context.societyId, context.user.flatId);
    const user = await User.findById(context.user.userId);

    return this.insertPayment(context, {
      ...dto,
      flatId: context.user.flatId,
      residentId: resident?._id?.toString(),
      payerName: user?.name || context.user.email,
      payerMobile: user?.mobile,
      paymentMethod: 'UPI',
      source: 'RESIDENT_SELF',
    });
  }

  /** Payment auto-created from a resident's WhatsApp reply to a reminder message. No HTTP
   * caller/actor exists for this path, so a synthetic system context is built the same way
   * verifySystemPayment() does for gateway-webhook-triggered verification. */
  async createInboundWhatsAppPayment(
    societyId: string,
    params: { flatId: string; amountPaise: number; proofFileId: string; systemActorUserId: string; notes?: string }
  ): Promise<IMcrPaymentRecordDocument> {
    const context: McrActorContext = {
      societyId,
      user: { userId: params.systemActorUserId, email: 'system@jenix.local', mobile: '0000000000', roleCode: 'SYSTEM', permissions: [], societyId },
    };
    const resident = await this.findResident(societyId, params.flatId);
    const flat = await Flat.findOne({ _id: params.flatId, societyId });

    return this.insertPayment(context, {
      flatId: params.flatId,
      residentId: resident?._id?.toString(),
      payerName: resident?.name || flat?.flatNo || 'Resident',
      payerMobile: resident?.mobile,
      amountPaise: params.amountPaise,
      paymentMethod: 'UPI',
      proofFileIds: [params.proofFileId],
      notes: params.notes,
      source: 'WHATSAPP_INBOUND',
    });
  }

  async getUpiQr(context: McrActorContext, amountPaise?: number): Promise<{
    configured: boolean;
    upiId?: string;
    payeeName?: string;
    upiLink?: string;
    qrDataUrl?: string;
  }> {
    const settings = await mcrSettingsService.getBySociety(context.societyId, context.user.userId);
    if (!settings.collectionUpiId) return { configured: false };

    const payeeName = settings.collectionUpiPayeeName || 'Society Maintenance';
    const upiLink = buildUpiLink(settings.collectionUpiId, payeeName, amountPaise);
    const qrDataUrl = await QRCode.toDataURL(upiLink);

    return { configured: true, upiId: settings.collectionUpiId, payeeName, upiLink, qrDataUrl };
  }

  private async insertPayment(context: McrActorContext, dto: PaymentInsertInput): Promise<IMcrPaymentRecordDocument> {
    await this.assertProofFiles(context.societyId, dto.proofFileIds);
    const paymentDate = dto.paymentDate || dto.receivedDate || new Date();
    const receivedDate = dto.receivedDate || paymentDate;
    const paymentNumber = await mcrNumberingService.nextPaymentNumber(context.societyId, receivedDate);

    try {
      return await McrPaymentRecord.create({
        societyId: context.societyId,
        paymentNumber,
        flatId: dto.flatId,
        residentId: dto.residentId,
        payerName: dto.payerName,
        payerMobile: dto.payerMobile,
        amountPaise: dto.amountPaise,
        paymentMethod: dto.paymentMethod,
        paymentDate,
        receivedDate,
        bankReference: dto.bankReference,
        upiReference: dto.upiReference,
        chequeNumber: dto.chequeNumber,
        chequeDate: dto.chequeDate,
        bankName: dto.bankName,
        cardReference: dto.cardReference,
        cashCollectionReference: dto.cashCollectionReference,
        notes: dto.notes,
        proofFileIds: dto.proofFileIds,
        status: 'PENDING_VERIFICATION',
        source: dto.source,
        idempotencyKey: dto.idempotencyKey,
        enteredBy: context.user.userId,
      });
    } catch (error: any) {
      if (error?.code === 11000) {
        logger.warn('MCR payment insert duplicate key:', {
          societyId: context.societyId,
          flatId: dto.flatId,
          paymentNumber,
          keyPattern: error.keyPattern,
          keyValue: error.keyValue,
        });
        throw new ConflictError('Duplicate MCR payment submission detected');
      }
      throw error;
    }
  }

  private async findResident(societyId: string, flatId: string, residentId?: string) {
    if (residentId) {
      const resident = await Resident.findOne({ _id: residentId, societyId, flatId, status: 'ACTIVE' });
      if (!resident) throw new NotFoundError('Resident');
      return resident;
    }

    return Resident.findOne({ societyId, flatId, primaryContact: true, status: 'ACTIVE' });
  }

  private async assertProofFiles(societyId: string, proofFileIds: string[]): Promise<void> {
    if (!proofFileIds.length) return;
    const count = await FileAsset.countDocuments({
      _id: { $in: proofFileIds },
      societyId,
      isActive: true,
    });
    if (count !== proofFileIds.length) {
      throw new ValidationError('One or more proof files are invalid for this society');
    }
  }
}

export const mcrPaymentService = new McrPaymentService();
