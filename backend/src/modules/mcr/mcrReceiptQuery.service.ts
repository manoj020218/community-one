import { NotFoundError } from '../../common/errors/AppError';
import { IMcrReceiptDocument, McrReceipt } from './mcrReceipt.model';

export class McrReceiptQueryService {
  async listBySociety(societyId: string, status?: string): Promise<IMcrReceiptDocument[]> {
    const query: Record<string, unknown> = { societyId };
    if (status) query.status = status;
    return McrReceipt.find(query).sort({ issuedAt: -1, createdAt: -1 });
  }

  async findById(societyId: string, receiptId: string): Promise<IMcrReceiptDocument> {
    const receipt = await McrReceipt.findOne({ _id: receiptId, societyId });
    if (!receipt) throw new NotFoundError('MCR receipt');
    return receipt;
  }

  async findByPaymentId(societyId: string, paymentId: string): Promise<IMcrReceiptDocument> {
    const receipt = await McrReceipt.findOne({ societyId, paymentId });
    if (!receipt) throw new NotFoundError('MCR receipt');
    return receipt;
  }
}

export const mcrReceiptQueryService = new McrReceiptQueryService();
