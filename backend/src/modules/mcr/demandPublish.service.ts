import { ConflictError, NotFoundError } from '../../common/errors/AppError';
import { McrActorContext } from './mcr.access.service';
import { MaintenanceDemand, IMaintenanceDemandDocument } from './demand.model';
import { ledgerService } from './ledger.service';
import { mcrAdvanceService } from './mcrAdvance.service';
import { mcrNumberingService } from './mcrNumbering.service';

export class DemandPublishService {
  async publishSystem(societyId: string, demandId: string, actorUserId: string) {
    const context: McrActorContext = {
      societyId,
      user: { userId: actorUserId, email: 'system@jenix.local', mobile: '0000000000', roleCode: 'SYSTEM', permissions: [], societyId },
    };
    return this.publish(context, demandId);
  }

  async publish(context: McrActorContext, demandId: string): Promise<IMaintenanceDemandDocument> {
    const demand = await MaintenanceDemand.findOne({ _id: demandId, societyId: context.societyId });
    if (!demand) {
      throw new NotFoundError('MaintenanceDemand');
    }
    if (demand.status !== 'DRAFT') {
      throw new ConflictError('Demand is not in draft state');
    }
    return this.publishExisting(context, demand);
  }

  async publishExisting(context: McrActorContext, demand: IMaintenanceDemandDocument): Promise<IMaintenanceDemandDocument> {
    const advanceAllocations = await mcrAdvanceService.allocateToDemand({
      societyId: context.societyId,
      flatId: demand.flatId.toString(),
      demandId: demand._id!.toString(),
      amountPaise: demand.totalDemandPaise,
      createdBy: context.user.userId,
    });
    const advanceAppliedPaise = advanceAllocations.reduce((sum, item) => sum + item.allocatedAmountPaise, 0);
    const demandNumber = await mcrNumberingService.nextDemandNumber(context.societyId, demand.billingPeriodKey);
    const ledgerEntry = await ledgerService.postDemandEntry({
      societyId: context.societyId,
      flatId: demand.flatId.toString(),
      sourceId: demand._id!.toString(),
      amountPaise: demand.totalDemandPaise,
      entryDate: new Date(),
      createdBy: context.user.userId,
      description: `${demand.demandType === 'LATE_FEE' ? 'Late fee' : 'Maintenance demand'} ${demand.billingPeriodLabel}`,
    });

    demand.status = 'PUBLISHED';
    demand.demandNumber = demandNumber;
    demand.publishedAt = new Date();
    demand.publishedBy = context.user.userId;
    demand.advanceAppliedPaise = advanceAppliedPaise;
    demand.paidPaise = advanceAppliedPaise;
    demand.outstandingPaise = Math.max(0, demand.totalDemandPaise - advanceAppliedPaise);
    demand.status = demand.outstandingPaise === 0
      ? 'PAID'
      : demand.dueDate < new Date()
        ? 'OVERDUE'
        : advanceAppliedPaise > 0
          ? 'PARTIALLY_PAID'
          : 'PUBLISHED';
    demand.ledgerEntryId = ledgerEntry._id!.toString();
    demand.updatedBy = context.user.userId;
    await demand.save();

    return demand;
  }
}

export const demandPublishService = new DemandPublishService();
