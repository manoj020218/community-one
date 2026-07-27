import mongoose from 'mongoose';
import { McrPaymentAllocation } from './mcrPaymentAllocation.model';
import { McrPaymentRecord } from './mcrPaymentRecord.model';

interface AdvanceAllocationInput {
  societyId: string;
  flatId: string;
  demandId: string;
  amountPaise: number;
  createdBy: string;
}

export class McrAdvanceService {
  async allocateToDemand(input: AdvanceAllocationInput) {
    const payments = await McrPaymentRecord.find({
      societyId: input.societyId,
      flatId: input.flatId,
      status: 'VERIFIED',
      advanceCreatedPaise: { $gt: 0 },
    }).sort({ verifiedAt: 1, paymentDate: 1, createdAt: 1 });
    if (!payments.length || input.amountPaise === 0) return [];

    const paymentIds = payments.map((item) => new mongoose.Types.ObjectId(item._id.toString()));
    const consumed = await McrPaymentAllocation.aggregate<{ _id: mongoose.Types.ObjectId; total: number }>([
      {
        $match: {
          societyId: new mongoose.Types.ObjectId(input.societyId),
          paymentId: { $in: paymentIds },
          allocationType: 'ADVANCE',
          reversedAt: { $exists: false },
        },
      },
      { $group: { _id: '$paymentId', total: { $sum: '$allocatedAmountPaise' } } },
    ]);

    const consumedMap = new Map(consumed.map((item) => [item._id.toString(), item.total]));
    const allocations = [];
    let remaining = input.amountPaise;

    for (const payment of payments) {
      const available = payment.advanceCreatedPaise - (consumedMap.get(payment._id.toString()) || 0);
      if (available <= 0) continue;
      const allocatedAmountPaise = Math.min(available, remaining);
      allocations.push({
        societyId: input.societyId,
        paymentId: payment._id,
        demandId: input.demandId,
        allocatedAmountPaise,
        allocationType: 'ADVANCE',
        createdBy: input.createdBy,
      });
      remaining -= allocatedAmountPaise;
      if (remaining === 0) break;
    }

    if (!allocations.length) return [];
    return McrPaymentAllocation.insertMany(allocations);
  }
}

export const mcrAdvanceService = new McrAdvanceService();
