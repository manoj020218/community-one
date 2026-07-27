import mongoose from 'mongoose';
import { MaintenanceDemand } from './demand.model';
import { LedgerEntry } from './ledger.model';
import { McrPaymentAllocation } from './mcrPaymentAllocation.model';
import { McrPaymentRecord } from './mcrPaymentRecord.model';
import { McrReceipt } from './mcrReceipt.model';
import { McrReportQuery } from './mcrReport.schemas';

function buildScope(societyId: string, flatId?: string) {
  const scope: Record<string, unknown> = { societyId: new mongoose.Types.ObjectId(societyId) };
  if (flatId) scope.flatId = new mongoose.Types.ObjectId(flatId);
  return scope;
}

export class McrReportService {
  async getSummary(societyId: string, flatId?: string) {
    const scope = buildScope(societyId, flatId);
    const now = new Date();
    const [demandAgg, paymentAgg, receiptCount, advanceBalancePaise] = await Promise.all([
      MaintenanceDemand.aggregate([
        { $match: { ...scope, status: { $ne: 'DRAFT' } } },
        {
          $group: {
            _id: null,
            demandCount: { $sum: 1 },
            totalDemandPaise: { $sum: '$totalDemandPaise' },
            advanceAppliedPaise: { $sum: '$advanceAppliedPaise' },
            paidPaise: { $sum: '$paidPaise' },
            outstandingPaise: { $sum: '$outstandingPaise' },
            overduePaise: {
              $sum: {
                $cond: [{ $and: [{ $gt: ['$outstandingPaise', 0] }, { $lt: ['$dueDate', now] }] }, '$outstandingPaise', 0],
              },
            },
          },
        },
      ]),
      McrPaymentRecord.aggregate([
        { $match: { ...scope, status: 'VERIFIED' } },
        { $group: { _id: null, collectionCount: { $sum: 1 }, collectedPaise: { $sum: '$amountPaise' }, advanceCreatedPaise: { $sum: '$advanceCreatedPaise' } } },
      ]),
      McrReceipt.countDocuments({ ...scope, status: 'ISSUED' }),
      this.getAdvanceBalancePaise(societyId, flatId),
    ]);

    return {
      demandCount: demandAgg[0]?.demandCount || 0,
      totalDemandPaise: demandAgg[0]?.totalDemandPaise || 0,
      advanceAppliedPaise: demandAgg[0]?.advanceAppliedPaise || 0,
      paidPaise: demandAgg[0]?.paidPaise || 0,
      outstandingPaise: demandAgg[0]?.outstandingPaise || 0,
      overduePaise: demandAgg[0]?.overduePaise || 0,
      collectionCount: paymentAgg[0]?.collectionCount || 0,
      collectedPaise: paymentAgg[0]?.collectedPaise || 0,
      advanceCreatedPaise: paymentAgg[0]?.advanceCreatedPaise || 0,
      advanceBalancePaise,
      issuedReceiptCount: receiptCount,
    };
  }

  async getStatement(societyId: string, flatId: string) {
    const summary = await this.getSummary(societyId, flatId);
    const [demands, payments, receipts, ledger] = await Promise.all([
      MaintenanceDemand.find({ societyId, flatId }).sort({ issueDate: -1, createdAt: -1 }),
      McrPaymentRecord.find({ societyId, flatId }).sort({ paymentDate: -1, createdAt: -1 }),
      McrReceipt.find({ societyId, flatId }).sort({ receiptDate: -1, createdAt: -1 }),
      LedgerEntry.find({ societyId, flatId }).sort({ entryDate: 1, createdAt: 1 }),
    ]);
    return { flatId, summary, demands, payments, receipts, ledger };
  }

  async listCollections(societyId: string, query: McrReportQuery) {
    const filter: Record<string, unknown> = { societyId, status: 'VERIFIED' };
    if (query.flatId) filter.flatId = query.flatId;
    if (query.startDate || query.endDate) {
      filter.paymentDate = { ...(query.startDate ? { $gte: query.startDate } : {}), ...(query.endDate ? { $lte: query.endDate } : {}) };
    }
    return McrPaymentRecord.find(filter).sort({ paymentDate: -1, createdAt: -1 }).limit(500);
  }

  private async getAdvanceBalancePaise(societyId: string, flatId?: string) {
    const payments = await McrPaymentRecord.find({
      societyId,
      ...(flatId ? { flatId } : {}),
      status: 'VERIFIED',
      advanceCreatedPaise: { $gt: 0 },
    }).select('_id advanceCreatedPaise');
    if (!payments.length) return 0;

    const created = payments.reduce((sum, item) => sum + item.advanceCreatedPaise, 0);
    const consumed = await McrPaymentAllocation.aggregate<{ _id: null; total: number }>([
      {
        $match: {
          societyId: new mongoose.Types.ObjectId(societyId),
          paymentId: { $in: payments.map((item) => new mongoose.Types.ObjectId(item._id.toString())) },
          allocationType: 'ADVANCE',
          reversedAt: { $exists: false },
        },
      },
      { $group: { _id: null, total: { $sum: '$allocatedAmountPaise' } } },
    ]);

    return created - (consumed[0]?.total || 0);
  }
}

export const mcrReportService = new McrReportService();
