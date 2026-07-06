import { PaymentRecord, IPaymentRecordDocument } from './payment.model';
import { NotFoundError } from '../../common/errors/AppError';
import { buildPaginatedResult } from '../../common/utils/response';
import { PaginatedResult } from '../../common/types';

export interface CreatePaymentDto {
  societyId: string;
  flatId: string;
  memberId?: string;
  amount: number;
  paymentPurpose: string;
  moduleCode?: string;
  paymentMode: string;
  paymentStatus?: string;
  transactionId?: string;
  paymentDate?: string;
  remarks?: string;
}

export class PaymentService {
  async create(dto: CreatePaymentDto, createdBy: string): Promise<IPaymentRecordDocument> {
    return PaymentRecord.create({ ...dto, createdBy, receivedBy: createdBy });
  }

  async findBySociety(societyId: string, page: number, limit: number, status?: string): Promise<PaginatedResult<IPaymentRecordDocument>> {
    const query: any = { societyId };
    if (status) query.paymentStatus = status;
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      PaymentRecord.find(query).populate('flatId', 'flatNo').populate('memberId', 'name').sort({ paymentDate: -1 }).skip(skip).limit(limit),
      PaymentRecord.countDocuments(query),
    ]);
    return buildPaginatedResult(items, total, page, limit);
  }

  async findByFlat(flatId: string): Promise<IPaymentRecordDocument[]> {
    return PaymentRecord.find({ flatId }).sort({ paymentDate: -1 });
  }

  async findById(id: string): Promise<IPaymentRecordDocument> {
    const payment = await PaymentRecord.findById(id).populate('flatId', 'flatNo').populate('memberId', 'name');
    if (!payment) throw new NotFoundError('Payment');
    return payment;
  }

  async getSummaryBySociety(societyId: string): Promise<{ total: number; received: number; pending: number }> {
    const stats = await PaymentRecord.aggregate([
      { $match: { societyId: new (require('mongoose').Types.ObjectId)(societyId) } },
      { $group: { _id: '$paymentStatus', total: { $sum: '$amount' }, count: { $sum: 1 } } },
    ]);
    const result = { total: 0, received: 0, pending: 0 };
    stats.forEach((s) => {
      result.total += s.total;
      if (s._id === 'RECEIVED') result.received = s.total;
      if (s._id === 'PENDING') result.pending = s.total;
    });
    return result;
  }
}

export const paymentService = new PaymentService();
