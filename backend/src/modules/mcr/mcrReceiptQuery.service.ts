import { NotFoundError } from '../../common/errors/AppError';
import { Flat } from '../flat/flat.model';
import { IMcrReceiptDocument, McrReceipt } from './mcrReceipt.model';

export class McrReceiptQueryService {
  async listBySociety(societyId: string, status?: string, search?: string): Promise<IMcrReceiptDocument[]> {
    const query: Record<string, unknown> = { societyId };
    if (status) query.status = status;

    if (search) {
      // flatNo lives on Flat, not the receipt — resolve matching flats first so searching
      // "206" finds the right receipts too.
      const matchingFlats = await Flat.find({ societyId, flatNo: { $regex: search, $options: 'i' } }).select('_id');
      query.$or = [
        { receiptNumber: { $regex: search, $options: 'i' } },
        { 'residentSnapshot.name': { $regex: search, $options: 'i' } },
        { 'paymentSnapshot.payerName': { $regex: search, $options: 'i' } },
        ...(matchingFlats.length ? [{ flatId: { $in: matchingFlats.map((f) => f._id) } }] : []),
      ];
    }

    return McrReceipt.find(query)
      .sort({ issuedAt: -1, createdAt: -1 })
      .populate({ path: 'flatId', select: 'flatNo towerId', populate: { path: 'towerId', select: 'name' } });
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
