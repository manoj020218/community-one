import mongoose from 'mongoose';
import { MaintenanceDemand } from './demand.model';
import { LedgerEntry } from './ledger.model';
import { McrPaymentAllocation } from './mcrPaymentAllocation.model';
import { McrPaymentRecord } from './mcrPaymentRecord.model';
import { McrReceipt } from './mcrReceipt.model';
import { McrReportQuery } from './mcrReport.schemas';
import { Tower } from '../tower/tower.model';
import { Expense } from './expense.model';
import { McrOpeningBalance } from './mcrOpeningBalance.model';

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
        // CANCELLED demands (e.g. one generated for a flat that was later deleted) don't
        // represent a real bill and shouldn't count toward Total Billed or anything derived
        // from it — only DRAFT was excluded before, so a cancelled demand kept inflating the
        // total forever.
        { $match: { ...scope, status: { $nin: ['DRAFT', 'CANCELLED'] } } },
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

  async getSummaryByTower(societyId: string) {
    const scope = buildScope(societyId);
    const now = new Date();
    const societyObjectId = new mongoose.Types.ObjectId(societyId);

    const [towers, demandRows, paymentRows, receiptRows] = await Promise.all([
      Tower.find({ societyId, isActive: true }).select('_id name').sort({ name: 1 }),
      MaintenanceDemand.aggregate([
        { $match: { ...scope, status: { $nin: ['DRAFT', 'CANCELLED'] } } },
        {
          $group: {
            _id: '$flatSnapshot.towerId',
            demandCount: { $sum: 1 },
            totalDemandPaise: { $sum: '$totalDemandPaise' },
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
      // Payments don't carry a tower snapshot the way demands do, so this joins back to Flat —
      // fine here since it's one dashboard-load aggregation, not a per-row list query.
      McrPaymentRecord.aggregate([
        { $match: { societyId: societyObjectId, status: 'VERIFIED' } },
        { $lookup: { from: 'flats', localField: 'flatId', foreignField: '_id', as: 'flat' } },
        { $unwind: { path: '$flat', preserveNullAndEmptyArrays: true } },
        { $group: { _id: '$flat.towerId', collectionCount: { $sum: 1 }, collectedPaise: { $sum: '$amountPaise' } } },
      ]),
      McrReceipt.aggregate([
        { $match: { societyId: societyObjectId, status: 'ISSUED' } },
        { $lookup: { from: 'flats', localField: 'flatId', foreignField: '_id', as: 'flat' } },
        { $unwind: { path: '$flat', preserveNullAndEmptyArrays: true } },
        { $group: { _id: '$flat.towerId', issuedReceiptCount: { $sum: 1 } } },
      ]),
    ]);

    const demandByTower = new Map(demandRows.map((r) => [String(r._id), r]));
    const paymentByTower = new Map(paymentRows.map((r) => [String(r._id), r]));
    const receiptByTower = new Map(receiptRows.map((r) => [String(r._id), r]));

    return towers.map((tower) => {
      const towerId = tower._id.toString();
      const demand = demandByTower.get(towerId);
      const payment = paymentByTower.get(towerId);
      const receipt = receiptByTower.get(towerId);
      return {
        towerId,
        towerName: tower.name,
        demandCount: demand?.demandCount || 0,
        totalDemandPaise: demand?.totalDemandPaise || 0,
        paidPaise: demand?.paidPaise || 0,
        outstandingPaise: demand?.outstandingPaise || 0,
        overduePaise: demand?.overduePaise || 0,
        collectionCount: payment?.collectionCount || 0,
        collectedPaise: payment?.collectedPaise || 0,
        issuedReceiptCount: receipt?.issuedReceiptCount || 0,
      };
    });
  }

  // Cash Balance / Bank Balance are always computed live from source records — never a
  // stored running total — for the same reason Tower.numberOfFloors/totalFlats went stale
  // earlier: a denormalized balance nothing actively resyncs *will* drift eventually.
  async getFundBalance(societyId: string) {
    const societyObjectId = new mongoose.Types.ObjectId(societyId);
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [opening, paymentBuckets, expenseBuckets, monthIncome, monthExpense] = await Promise.all([
      McrOpeningBalance.findOne({ societyId }),
      McrPaymentRecord.aggregate([
        { $match: { societyId: societyObjectId, status: 'VERIFIED' } },
        { $group: { _id: { $cond: [{ $eq: ['$paymentMethod', 'CASH'] }, 'CASH', 'BANK'] }, total: { $sum: '$amountPaise' } } },
      ]),
      Expense.aggregate([
        { $match: { societyId: societyObjectId, status: 'RECORDED' } },
        { $group: { _id: '$paymentMode', total: { $sum: '$amountPaise' } } },
      ]),
      McrPaymentRecord.aggregate([
        { $match: { societyId: societyObjectId, status: 'VERIFIED', paymentDate: { $gte: startOfMonth } } },
        { $group: { _id: null, total: { $sum: '$amountPaise' } } },
      ]),
      Expense.aggregate([
        { $match: { societyId: societyObjectId, status: 'RECORDED', expenseDate: { $gte: startOfMonth } } },
        { $group: { _id: null, total: { $sum: '$amountPaise' } } },
      ]),
    ]);

    const cashInPaise = paymentBuckets.find((r) => r._id === 'CASH')?.total || 0;
    const bankInPaise = paymentBuckets.find((r) => r._id === 'BANK')?.total || 0;
    const cashOutPaise = expenseBuckets.find((r) => r._id === 'CASH')?.total || 0;
    const bankOutPaise = expenseBuckets.find((r) => r._id === 'BANK')?.total || 0;
    const openingCashPaise = opening?.openingCashPaise || 0;
    const openingBankPaise = opening?.openingBankPaise || 0;

    return {
      hasOpeningBalance: !!opening,
      asOfDate: opening?.asOfDate || null,
      openingCashPaise,
      openingBankPaise,
      cashInPaise,
      cashOutPaise,
      bankInPaise,
      bankOutPaise,
      cashBalancePaise: openingCashPaise + cashInPaise - cashOutPaise,
      bankBalancePaise: openingBankPaise + bankInPaise - bankOutPaise,
      totalBalancePaise: openingCashPaise + openingBankPaise + cashInPaise + bankInPaise - cashOutPaise - bankOutPaise,
      currentMonthIncomePaise: monthIncome[0]?.total || 0,
      currentMonthExpensePaise: monthExpense[0]?.total || 0,
    };
  }

  async getIncomeExpenditureStatement(societyId: string, startDate: Date, endDate: Date) {
    const societyObjectId = new mongoose.Types.ObjectId(societyId);
    const opening = await McrOpeningBalance.findOne({ societyId });
    const openingTotalPaise = (opening?.openingCashPaise || 0) + (opening?.openingBankPaise || 0);

    const [priorIncome, priorExpense, periodIncome, expensesByCategory] = await Promise.all([
      McrPaymentRecord.aggregate([
        { $match: { societyId: societyObjectId, status: 'VERIFIED', paymentDate: { $lt: startDate } } },
        { $group: { _id: null, total: { $sum: '$amountPaise' } } },
      ]),
      Expense.aggregate([
        { $match: { societyId: societyObjectId, status: 'RECORDED', expenseDate: { $lt: startDate } } },
        { $group: { _id: null, total: { $sum: '$amountPaise' } } },
      ]),
      McrPaymentRecord.aggregate([
        { $match: { societyId: societyObjectId, status: 'VERIFIED', paymentDate: { $gte: startDate, $lte: endDate } } },
        { $group: { _id: null, total: { $sum: '$amountPaise' }, count: { $sum: 1 } } },
      ]),
      Expense.aggregate([
        { $match: { societyId: societyObjectId, status: 'RECORDED', expenseDate: { $gte: startDate, $lte: endDate } } },
        { $group: { _id: '$category', total: { $sum: '$amountPaise' }, count: { $sum: 1 } } },
        { $sort: { total: -1 } },
      ]),
    ]);

    const periodOpeningBalancePaise = openingTotalPaise + (priorIncome[0]?.total || 0) - (priorExpense[0]?.total || 0);
    const totalIncomePaise = periodIncome[0]?.total || 0;
    const totalExpensePaise = expensesByCategory.reduce((sum, r) => sum + r.total, 0);

    return {
      startDate,
      endDate,
      periodOpeningBalancePaise,
      incomeCount: periodIncome[0]?.count || 0,
      totalIncomePaise,
      expensesByCategory: expensesByCategory.map((r) => ({ category: r._id, count: r.count, totalPaise: r.total })),
      totalExpensePaise,
      closingBalancePaise: periodOpeningBalancePaise + totalIncomePaise - totalExpensePaise,
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
