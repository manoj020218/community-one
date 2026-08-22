import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from '../../common/errors/AppError';
import { MaintenanceDemand, IMaintenanceDemandDocument } from './demand.model';
import { ledgerService } from './ledger.service';
import { sumPaise } from './mcr.money';
import { McrActorContext } from './mcr.access.service';
import { McrPaymentAllocation } from './mcrPaymentAllocation.model';
import { IMcrPaymentRecordDocument, McrPaymentRecord } from './mcrPaymentRecord.model';
import { rejectMcrPaymentSchema, verifyMcrPaymentSchema } from './mcrPayment.schemas';
import { mcrReceiptService } from './mcrReceipt.service';
import { mcrSettingsService } from './mcrSettings.service';
import { parseOrThrow } from './mcr.validation';

// OVERDUE is not a resolved/terminal state — it's just PUBLISHED (or PARTIALLY_PAID) past its
// due date, and applyAllocations() below routinely leaves a demand in this exact status after a
// partial payment. Excluding it here meant that once ANY demand went overdue, no payment could
// ever be applied to it again — every collection against that flat silently became stranded
// "advance" instead of actually reducing what was owed.
const PAYABLE_DEMAND_STATUSES = ['PUBLISHED', 'PARTIALLY_PAID', 'OVERDUE'];

interface ResolvedAllocation {
  demand: IMaintenanceDemandDocument;
  amountPaise: number;
  allocationType: 'SELECTED_DEMAND' | 'OLDEST_FIRST';
}

interface AllocationResolution {
  allocations: ResolvedAllocation[];
  advanceAmountPaise: number;
}

export class McrPaymentVerificationService {
  async verifySystemPayment(societyId: string, paymentId: string, actorUserId: string) {
    const context: McrActorContext = {
      societyId,
      user: { userId: actorUserId, email: 'system@jenix.local', mobile: '0000000000', roleCode: 'SYSTEM', permissions: [], societyId },
    };
    return this.verifyPending(context, paymentId, {}, true);
  }

  async verifyPayment(context: McrActorContext, paymentId: string, input: unknown) {
    return this.verifyPending(context, paymentId, input, false);
  }

  private async verifyPending(context: McrActorContext, paymentId: string, input: unknown, skipReviewerCheck: boolean) {
    const dto = parseOrThrow(verifyMcrPaymentSchema, input || {});
    const payment = await this.getPendingPayment(context.societyId, paymentId);
    const settings = await mcrSettingsService.getBySociety(context.societyId, context.user.userId);
    if (!skipReviewerCheck) {
      this.assertReviewerAllowed(payment, context.user.userId, settings.makerCheckerEnabled, settings.allowSelfVerification);
    }
    const resolution = dto.allocations?.length
      ? await this.resolveSelectedAllocations(context.societyId, payment, dto.allocations, settings.allowPartialPayment, settings.allowAdvancePayment)
      : await this.resolveOldestFirstAllocations(context.societyId, payment, settings.allowPartialPayment, settings.allowAdvancePayment);
    const savedAllocations = resolution.allocations.length
      ? await McrPaymentAllocation.create(resolution.allocations.map((item) => ({
        societyId: context.societyId,
        paymentId: payment._id,
        demandId: item.demand._id,
        allocatedAmountPaise: item.amountPaise,
        allocationType: item.allocationType,
        createdBy: context.user.userId,
      })))
      : [];

    await this.applyAllocations(resolution.allocations, context.user.userId);
    const verifiedAt = new Date();
    const ledgerEntry = await ledgerService.postPaymentEntry({
      societyId: context.societyId,
      flatId: payment.flatId.toString(),
      residentId: payment.residentId?.toString(),
      sourceId: payment._id!.toString(),
      amountPaise: payment.amountPaise,
      entryDate: verifiedAt,
      createdBy: context.user.userId,
      description: `MCR payment ${payment.paymentNumber}`,
    });
    const receipt = await mcrReceiptService.issueForPayment({
      societyId: context.societyId,
      payment,
      allocations: resolution.allocations.map((item) => ({
        demandId: item.demand._id!.toString(),
        demandNumber: item.demand.demandNumber!,
        allocatedAmountPaise: item.amountPaise,
      })),
      advanceAmountPaise: resolution.advanceAmountPaise,
      issuedBy: context.user.userId,
      issuedAt: verifiedAt,
    });

    payment.status = 'VERIFIED';
    payment.verifiedBy = context.user.userId;
    payment.verifiedAt = verifiedAt;
    payment.receiptId = receipt._id!.toString();
    payment.allocatedAmountPaise = sumPaise(resolution.allocations.map((item) => item.amountPaise));
    payment.advanceCreatedPaise = resolution.advanceAmountPaise;
    await payment.save();

    return { payment, allocations: savedAllocations, receipt, ledgerEntry };
  }

  async rejectPayment(context: McrActorContext, paymentId: string, input: unknown): Promise<IMcrPaymentRecordDocument> {
    const dto = parseOrThrow(rejectMcrPaymentSchema, input);
    const payment = await this.getPendingPayment(context.societyId, paymentId);
    const settings = await mcrSettingsService.getBySociety(context.societyId, context.user.userId);
    this.assertReviewerAllowed(payment, context.user.userId, settings.makerCheckerEnabled, settings.allowSelfVerification);
    payment.status = 'REJECTED';
    payment.rejectedBy = context.user.userId;
    payment.rejectedAt = new Date();
    payment.rejectionReason = dto.reason;
    await payment.save();
    return payment;
  }

  private async getPendingPayment(societyId: string, paymentId: string): Promise<IMcrPaymentRecordDocument> {
    const payment = await McrPaymentRecord.findOne({ _id: paymentId, societyId });
    if (!payment) throw new NotFoundError('MCR payment');
    if (!['DRAFT', 'PENDING_VERIFICATION'].includes(payment.status)) {
      throw new ConflictError('Payment is not pending verification');
    }
    return payment;
  }

  private assertReviewerAllowed(payment: IMcrPaymentRecordDocument, reviewerId: string, makerChecker: boolean, allowSelfVerification: boolean): void {
    if (makerChecker && !allowSelfVerification && payment.enteredBy.toString() === reviewerId) {
      throw new ForbiddenError('Maker-checker requires a different user to verify or reject this payment');
    }
  }

  private async resolveSelectedAllocations(
    societyId: string,
    payment: IMcrPaymentRecordDocument,
    allocations: Array<{ demandId: string; amountPaise: number }>,
    allowPartialPayment: boolean,
    allowAdvancePayment: boolean
  ): Promise<AllocationResolution> {
    const demands = await MaintenanceDemand.find({
      societyId,
      flatId: payment.flatId,
      _id: { $in: allocations.map((item) => item.demandId) },
    });
    const demandMap = new Map(demands.map((item) => [item._id.toString(), item]));

    const resolved = allocations.map((item) => {
      const demand = demandMap.get(item.demandId);
      if (!demand || !demand.demandNumber || !PAYABLE_DEMAND_STATUSES.includes(demand.status) || demand.outstandingPaise <= 0) {
        throw new ValidationError('One or more selected demands are not eligible for payment allocation');
      }
      if (item.amountPaise > demand.outstandingPaise) throw new ValidationError('Allocation cannot exceed the demand outstanding amount');
      if (!allowPartialPayment && item.amountPaise < demand.outstandingPaise) throw new ValidationError('Partial payments are disabled in MCR settings');
      return { demand, amountPaise: item.amountPaise, allocationType: 'SELECTED_DEMAND' as const };
    });

    return this.buildAllocationResolution(payment.amountPaise, resolved, allowAdvancePayment);
  }

  private async resolveOldestFirstAllocations(
    societyId: string,
    payment: IMcrPaymentRecordDocument,
    allowPartialPayment: boolean,
    allowAdvancePayment: boolean
  ): Promise<AllocationResolution> {
    const demands = await MaintenanceDemand.find({
      societyId,
      flatId: payment.flatId,
      status: { $in: PAYABLE_DEMAND_STATUSES },
      outstandingPaise: { $gt: 0 },
    }).sort({ dueDate: 1, createdAt: 1 });
    if (!demands.length) {
      if (!allowAdvancePayment) throw new ValidationError('No outstanding published demands are available for this flat');
      return { allocations: [], advanceAmountPaise: payment.amountPaise };
    }

    const allocations: ResolvedAllocation[] = [];
    let remaining = payment.amountPaise;
    for (const demand of demands) {
      if (remaining === 0) break;
      const amountPaise = Math.min(remaining, demand.outstandingPaise);
      if (!allowPartialPayment && amountPaise < demand.outstandingPaise) throw new ValidationError('Partial payments are disabled in MCR settings');
      allocations.push({ demand, amountPaise, allocationType: 'OLDEST_FIRST' });
      remaining -= amountPaise;
    }

    if (remaining > 0 && !allowAdvancePayment) {
      throw new ValidationError('Advance payments are disabled in MCR settings');
    }

    return { allocations, advanceAmountPaise: remaining };
  }

  private buildAllocationResolution(
    amountPaise: number,
    allocations: ResolvedAllocation[],
    allowAdvancePayment: boolean
  ): AllocationResolution {
    const allocatedAmountPaise = sumPaise(allocations.map((item) => item.amountPaise));
    if (allocatedAmountPaise > amountPaise) {
      throw new ValidationError('Allocation total cannot exceed the payment amount');
    }

    const advanceAmountPaise = amountPaise - allocatedAmountPaise;
    if (advanceAmountPaise > 0 && !allowAdvancePayment) {
      throw new ValidationError('Advance payments are disabled in MCR settings');
    }

    return { allocations, advanceAmountPaise };
  }

  private async applyAllocations(allocations: ResolvedAllocation[], updatedBy: string): Promise<void> {
    for (const item of allocations) {
      item.demand.paidPaise += item.amountPaise;
      item.demand.outstandingPaise = Math.max(0, item.demand.totalDemandPaise - item.demand.paidPaise);
      item.demand.status = item.demand.outstandingPaise === 0 ? 'PAID' : item.demand.dueDate < new Date() ? 'OVERDUE' : 'PARTIALLY_PAID';
      item.demand.updatedBy = updatedBy;
      await item.demand.save();
    }
  }
}

export const mcrPaymentVerificationService = new McrPaymentVerificationService();
