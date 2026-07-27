import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { ConflictError, NotFoundError, ValidationError } from '../../common/errors/AppError';
import { env } from '../../config/env';
import { Flat } from '../flat/flat.model';
import { Society } from '../society/society.model';
import { McrSettings } from './mcrSettings.model';
import { IMcrReceiptDocument, McrReceipt } from './mcrReceipt.model';

interface ReceiptTokenPayload {
  receiptId: string;
  societyId: string;
  receiptNumber: string;
  templateVersion: string;
}

export class McrReceiptPublicService {
  async buildShareInfo(receipt: IMcrReceiptDocument, verifyBaseUrl: string, documentBaseUrl: string) {
    if (!(await this.isEnabled(receipt.societyId.toString())) || receipt.status !== 'ISSUED') return null;
    const token = this.signToken(receipt);
    const hash = this.hashToken(token);
    if (receipt.publicVerificationTokenHash !== hash) {
      receipt.publicVerificationTokenHash = hash;
      await receipt.save();
    }
    return {
      token,
      verificationUrl: `${verifyBaseUrl}?token=${encodeURIComponent(token)}`,
      documentUrl: `${documentBaseUrl}?token=${encodeURIComponent(token)}`,
    };
  }

  async verifyToken(token: string) {
    let payload: ReceiptTokenPayload;
    try {
      payload = jwt.verify(token, env.JWT_SECRET, { audience: 'mcr-receipt-public' }) as ReceiptTokenPayload;
    } catch {
      throw new ValidationError('Invalid receipt verification token');
    }

    const receipt = await McrReceipt.findOne({
      _id: payload.receiptId,
      societyId: payload.societyId,
      receiptNumber: payload.receiptNumber,
      templateVersion: payload.templateVersion,
    });
    if (!receipt) throw new NotFoundError('MCR receipt');
    if (!(await this.isEnabled(payload.societyId))) throw new ConflictError('Public receipt verification is disabled');
    if (receipt.status !== 'ISSUED') throw new ConflictError('Receipt is not active');
    if (receipt.publicVerificationTokenHash !== this.hashToken(token)) {
      throw new ValidationError('Receipt verification token is no longer valid');
    }

    const [society, flat] = await Promise.all([
      Society.findById(payload.societyId).select('name code city state'),
      Flat.findById(receipt.flatId).select('flatNo'),
    ]);
    return {
      receipt,
      summary: {
        receiptNumber: receipt.receiptNumber,
        status: receipt.status,
        amountPaise: receipt.amountPaise,
        advanceAmountPaise: receipt.advanceAmountPaise,
        issuedAt: receipt.issuedAt,
        payerName: receipt.paymentSnapshot.payerName,
        paymentMethod: receipt.paymentSnapshot.paymentMethod,
        flatNo: flat?.flatNo,
        societyName: society?.name,
        societyCode: society?.code,
        location: [society?.city, society?.state].filter(Boolean).join(', '),
        allocations: receipt.allocationSnapshot,
      },
    };
  }

  private async isEnabled(societyId: string) {
    const settings = await McrSettings.findOne({ societyId }).select('publicReceiptVerificationEnabled');
    return Boolean(settings?.publicReceiptVerificationEnabled);
  }

  private signToken(receipt: IMcrReceiptDocument) {
    const payload: ReceiptTokenPayload = {
      receiptId: receipt._id!.toString(),
      societyId: receipt.societyId.toString(),
      receiptNumber: receipt.receiptNumber,
      templateVersion: receipt.templateVersion || '1.0.0',
    };
    return jwt.sign(payload, env.JWT_SECRET, { audience: 'mcr-receipt-public', noTimestamp: true });
  }

  private hashToken(token: string) {
    return crypto.createHash('sha256').update(token).digest('hex');
  }
}

export const mcrReceiptPublicService = new McrReceiptPublicService();
