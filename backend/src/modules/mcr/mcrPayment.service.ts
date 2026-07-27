import { ConflictError, NotFoundError, ValidationError } from '../../common/errors/AppError';
import { Flat } from '../flat/flat.model';
import { FileAsset } from '../fileAsset/fileAsset.model';
import { Resident } from '../resident/resident.model';
import { McrActorContext } from './mcr.access.service';
import { McrPaymentRecord, IMcrPaymentRecordDocument } from './mcrPaymentRecord.model';
import { createMcrPaymentSchema } from './mcrPayment.schemas';
import { mcrNumberingService } from './mcrNumbering.service';
import { parseOrThrow } from './mcr.validation';

export class McrPaymentService {
  async listBySociety(societyId: string, status?: string): Promise<IMcrPaymentRecordDocument[]> {
    const query: Record<string, unknown> = { societyId };
    if (status) query.status = status;
    return McrPaymentRecord.find(query).sort({ receivedDate: -1, createdAt: -1 });
  }

  async findById(societyId: string, paymentId: string): Promise<IMcrPaymentRecordDocument> {
    const payment = await McrPaymentRecord.findOne({ _id: paymentId, societyId });
    if (!payment) throw new NotFoundError('MCR payment');
    return payment;
  }

  async createManualPayment(context: McrActorContext, input: unknown): Promise<IMcrPaymentRecordDocument> {
    const dto = parseOrThrow(createMcrPaymentSchema, input);
    const flat = await Flat.findOne({ _id: dto.flatId, societyId: context.societyId });
    if (!flat) throw new NotFoundError('Flat');

    const resident = await this.findResident(context.societyId, dto.flatId, dto.residentId);
    await this.assertProofFiles(context.societyId, dto.proofFileIds);
    const paymentDate = dto.paymentDate || dto.receivedDate || new Date();
    const receivedDate = dto.receivedDate || paymentDate;
    const paymentNumber = await mcrNumberingService.nextPaymentNumber(context.societyId, receivedDate);

    try {
      return await McrPaymentRecord.create({
        societyId: context.societyId,
        paymentNumber,
        flatId: dto.flatId,
        residentId: resident?._id,
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
        source: 'MANUAL',
        idempotencyKey: dto.idempotencyKey,
        enteredBy: context.user.userId,
      });
    } catch (error: any) {
      if (error?.code === 11000) {
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
