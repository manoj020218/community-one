import { ConflictError, NotFoundError } from '../../common/errors/AppError';
import { MaintenanceDemand } from './demand.model';
import { LedgerEntry } from './ledger.model';
import { ledgerService } from './ledger.service';
import { McrActorContext } from './mcr.access.service';
import { IMcrPaymentAllocationDocument, McrPaymentAllocation } from './mcrPaymentAllocation.model';
import { IMcrPaymentRecordDocument, McrPaymentRecord } from './mcrPaymentRecord.model';
import { bounceMcrPaymentSchema, cancelMcrPaymentSchema } from './mcrPayment.schemas';
import { McrReceipt } from './mcrReceipt.model';
import { parseOrThrow } from './mcr.validation';

export class McrPaymentLifecycleService {
  async cancelPayment(context: McrActorContext, paymentId: string, input: unknown): Promise<IMcrPaymentRecordDocument> {
    const dto = parseOrThrow(cancelMcrPaymentSchema, input);
    const payment = await McrPaymentRecord.findOne({ _id: paymentId, societyId: context.societyId });
    if (!payment) throw new NotFoundError('MCR payment');
    if (payment.status === 'VERIFIED') throw new ConflictError('Verified payments must be bounced, not cancelled');
    if (payment.status === 'BOUNCED' || payment.status === 'CANCELLED') throw new ConflictError('Payment is already closed');
    if (!['DRAFT', 'PENDING_VERIFICATION', 'REJECTED'].includes(payment.status)) {
      throw new ConflictError('Payment cannot be cancelled in its current state');
    }

    payment.status = 'CANCELLED';
    payment.cancelledBy = context.user.userId;
    payment.cancelledAt = new Date();
    payment.cancellationReason = dto.reason;
    await payment.save();
    return payment;
  }

  async bouncePayment(context: McrActorContext, paymentId: string, input: unknown) {
    const dto = parseOrThrow(bounceMcrPaymentSchema, input);
    const payment = await McrPaymentRecord.findOne({ _id: paymentId, societyId: context.societyId });
    if (!payment) throw new NotFoundError('MCR payment');
    if (payment.status !== 'VERIFIED') throw new ConflictError('Only verified payments can be bounced');

    const allocations = await McrPaymentAllocation.find({
      societyId: context.societyId,
      paymentId,
      reversedAt: { $exists: false },
    });

    await this.reverseAllocations(context.societyId, allocations, context.user.userId, dto.reason);
    const paymentLedger = await LedgerEntry.findOne({
      societyId: context.societyId,
      sourceType: 'PAYMENT',
      sourceId: paymentId,
    });
    if (!paymentLedger) throw new NotFoundError('MCR payment ledger entry');

    const reversalEntry = await ledgerService.reverseEntry(
      paymentLedger._id.toString(),
      context.user.userId,
      `MCR payment reversal ${payment.paymentNumber}: ${dto.reason}`,
      new Date()
    );
    const receipt = await this.voidReceipt(context.societyId, payment.receiptId, paymentId, context.user.userId, dto.reason);

    payment.status = 'BOUNCED';
    payment.bouncedBy = context.user.userId;
    payment.bouncedAt = new Date();
    payment.bounceReason = dto.reason;
    payment.reversedLedgerEntryId = reversalEntry._id.toString();
    await payment.save();

    return { payment, reversalEntry, receipt, reversedAllocationCount: allocations.length };
  }

  private async reverseAllocations(societyId: string, allocations: IMcrPaymentAllocationDocument[], userId: string, reason: string): Promise<void> {
    const demands = await MaintenanceDemand.find({
      societyId,
      _id: { $in: allocations.map((item) => item.demandId) },
    });
    const demandMap = new Map(demands.map((item) => [item._id.toString(), item]));
    const reversedAt = new Date();

    for (const allocation of allocations) {
      const demand = demandMap.get(allocation.demandId.toString());
      if (!demand) throw new NotFoundError('MaintenanceDemand');
      if (allocation.allocationType === 'ADVANCE') {
        demand.advanceAppliedPaise = Math.max(0, demand.advanceAppliedPaise - allocation.allocatedAmountPaise);
      }
      demand.paidPaise = Math.max(0, demand.paidPaise - allocation.allocatedAmountPaise);
      demand.outstandingPaise = Math.max(0, demand.totalDemandPaise - demand.paidPaise);
      demand.status = demand.outstandingPaise === 0 ? 'PAID' : reversedAt > demand.dueDate ? 'OVERDUE' : demand.paidPaise === 0 ? 'PUBLISHED' : 'PARTIALLY_PAID';
      demand.updatedBy = userId;
      await demand.save();

      allocation.reversedAt = reversedAt;
      allocation.reversedBy = userId;
      allocation.reversalReason = reason;
      await allocation.save();
    }
  }

  private async voidReceipt(societyId: string, receiptId: string | undefined, paymentId: string, userId: string, reason: string) {
    const receipt = receiptId
      ? await McrReceipt.findOne({ _id: receiptId, societyId })
      : await McrReceipt.findOne({ societyId, paymentId, status: 'ISSUED' });
    if (!receipt || receipt.status !== 'ISSUED') return null;

    receipt.status = 'VOID';
    receipt.voidedAt = new Date();
    receipt.voidedBy = userId;
    receipt.voidReason = reason;
    await receipt.save();
    return receipt;
  }
}

export const mcrPaymentLifecycleService = new McrPaymentLifecycleService();
