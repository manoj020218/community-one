import { Types } from 'mongoose';
import { Flat } from '../flat/flat.model';
import { Resident } from '../resident/resident.model';
import { BillingPlan, IBillingPlanDocument } from './billingPlan.model';
import { ChargeHead } from './chargeHead.model';
import { McrActorContext } from './mcr.access.service';
import { MaintenanceDemand, IMaintenanceDemandDocument } from './demand.model';
import { demandDraftCreateSchema } from './demand.schemas';
import { McrBillingCycle, mcrBillingCycleService } from './mcrBillingCycle.service';
import { mcrSettingsService } from './mcrSettings.service';
import { IMcrSettingsDocument } from './mcrSettings.model';
import { parseOrThrow } from './mcr.validation';
import { NotFoundError, ConflictError } from '../../common/errors/AppError';

type BillingPolicy = 'BILL_FULL' | 'BILL_REDUCED' | 'EXEMPT';

// Resolves what fraction of the normal bill applies, and whether the resulting demand should
// be withheld from auto-publish. Only Vacant/Builder-Unsold flats are policy-governed — every
// other occupancy state (including Locked/Under Renovation) is always billed in full, since the
// owner owes maintenance either way.
function resolveBillingPolicy(occupancyStatus: string, settings: IMcrSettingsDocument): { percent: number; policy: 'FULL' | 'REDUCED' | 'EXEMPT'; hold: boolean } {
  let policy: BillingPolicy = 'BILL_FULL';
  let reducedPercent = 100;
  if (occupancyStatus === 'VACANT') {
    policy = settings.vacantFlatPolicy;
    reducedPercent = settings.vacantFlatReducedPercent;
  } else if (occupancyStatus === 'BUILDER_UNSOLD') {
    policy = settings.unsoldFlatPolicy;
    reducedPercent = settings.unsoldFlatReducedPercent;
  }
  if (policy === 'EXEMPT') return { percent: 100, policy: 'EXEMPT', hold: true };
  if (policy === 'BILL_REDUCED') return { percent: reducedPercent, policy: 'REDUCED', hold: false };
  return { percent: 100, policy: 'FULL', hold: false };
}

export class DemandDraftService {
  async listBySociety(societyId: string, status?: string, towerId?: string): Promise<IMaintenanceDemandDocument[]> {
    const query: Record<string, unknown> = { societyId };
    if (status) query.status = status;
    // towerId lives on the flat, not the demand — flatSnapshot.towerId was captured at draft
    // time specifically so filters like this don't need a join back to Flat.
    if (towerId) query['flatSnapshot.towerId'] = new Types.ObjectId(towerId);
    return MaintenanceDemand.find(query).sort({ createdAt: -1 });
  }

  // No refund flow exists yet, so a demand with any payment already recorded against it can't
  // be cancelled here — only DRAFT/PUBLISHED/OVERDUE demands with zero paidPaise (e.g. one
  // generated for a flat that was later deleted, per the case this was added for).
  async cancel(context: McrActorContext, demandId: string): Promise<IMaintenanceDemandDocument> {
    const demand = await MaintenanceDemand.findOne({ _id: demandId, societyId: context.societyId });
    if (!demand) throw new NotFoundError('MaintenanceDemand');
    if (demand.status === 'CANCELLED') return demand;
    if (demand.status === 'PAID' || demand.paidPaise > 0) {
      throw new ConflictError('Cannot cancel a demand with payments already recorded against it.');
    }

    demand.status = 'CANCELLED';
    demand.outstandingPaise = 0;
    demand.updatedBy = context.user.userId;
    await demand.save();
    return demand;
  }

  async createDrafts(context: McrActorContext, input: unknown) {
    const dto = parseOrThrow(demandDraftCreateSchema, input);
    const billingPlan = await BillingPlan.findOne({ _id: dto.billingPlanId, societyId: context.societyId }).orFail();
    const issueDate = mcrBillingCycleService.normalizeDate(dto.issueDate || new Date());
    const cycle: McrBillingCycle = {
      billingPeriodKey: dto.billingPeriodKey,
      billingPeriodLabel: dto.billingPeriodLabel || dto.billingPeriodKey,
      issueDate,
      dueDate: mcrBillingCycleService.buildDueDate(issueDate, billingPlan.dueDay),
    };
    // towerId scopes generation to one block's flats when no explicit flatIds list was given —
    // lets an admin plan a billing cycle for just one tower instead of always society-wide.
    let flatIds = dto.flatIds;
    if (dto.towerId && !flatIds?.length) {
      const towerFlats = await Flat.find({ societyId: context.societyId, towerId: dto.towerId, isActive: true }).select('_id');
      flatIds = towerFlats.map((f) => f._id.toString());
    }
    return this.createForPlan(context.societyId, billingPlan, cycle, context.user.userId, flatIds);
  }

  async createScheduledDrafts(societyId: string, billingPlanId: string, cycle: McrBillingCycle, actorUserId: string) {
    const billingPlan = await BillingPlan.findOne({ _id: billingPlanId, societyId }).orFail();
    return this.createForPlan(societyId, billingPlan, cycle, actorUserId);
  }

  private async createForPlan(
    societyId: string,
    billingPlan: IBillingPlanDocument,
    cycle: McrBillingCycle,
    actorUserId: string,
    flatIds?: string[]
  ) {
    // isActive, not status — Flat.delete() only flips isActive (status is a separate, unused
    // field nothing in the flat module ever updates), so filtering on status here silently
    // kept billing deleted flats forever. Vacant/Builder-Unsold flats are no longer excluded
    // outright — a demand is still generated for every active flat regardless of occupancy
    // (an accrual trail), with the society's own vacant/unsold billing policy (see
    // resolveBillingPolicy below) deciding the amount and whether it's withheld from
    // auto-publish. LOCKED/UNDER_RENOVATION always bill in full — the owner owes maintenance
    // either way, only genuinely vacant/unsold units are policy-governed.
    const flatQuery: Record<string, unknown> = { societyId, isActive: true };
    if (flatIds?.length) flatQuery._id = { $in: flatIds };
    const flats = await Flat.find(flatQuery).sort({ flatNo: 1 });
    const settings = await mcrSettingsService.getBySociety(societyId, actorUserId);
    const chargeHeadIds = [...new Set(billingPlan.chargeLines.map((line) => line.chargeHeadId.toString()))];
    const chargeHeads = await ChargeHead.find({ societyId, _id: { $in: chargeHeadIds } });
    const chargeHeadMap = new Map(chargeHeads.map((item) => [item._id.toString(), item]));
    const existing = await MaintenanceDemand.find({
      societyId,
      billingPlanId: billingPlan._id,
      billingPeriodKey: cycle.billingPeriodKey,
      flatId: { $in: flats.map((flat) => flat._id) },
      version: 1,
    });
    const existingMap = new Map(existing.map((item) => [item.flatId.toString(), item]));
    const residents = await Resident.find({ societyId, flatId: { $in: flats.map((flat) => flat._id) }, primaryContact: true, status: 'ACTIVE' });
    const residentMap = new Map(residents.map((item) => [item.flatId.toString(), item]));
    const created: IMaintenanceDemandDocument[] = [];

    for (const flat of flats) {
      if (existingMap.has(flat._id.toString())) continue;
      const { percent, policy, hold } = resolveBillingPolicy(flat.occupancyStatus, settings);
      const chargeLines = billingPlan.chargeLines.map((line) => {
        const chargeHead = chargeHeadMap.get(line.chargeHeadId.toString());
        return {
          chargeHeadId: line.chargeHeadId,
          chargeCode: chargeHead?.code || 'UNKNOWN',
          chargeName: chargeHead?.name || 'Unknown Charge Head',
          amountPaise: percent === 100 ? line.amountPaise : Math.round((line.amountPaise * percent) / 100),
          calculationMethod: line.calculationMethod,
        };
      });
      const subtotalPaise = chargeLines.reduce((sum, line) => sum + line.amountPaise, 0);
      const resident = residentMap.get(flat._id.toString());
      created.push(await MaintenanceDemand.create({
        societyId,
        billingPlanId: billingPlan._id,
        flatId: flat._id,
        demandType: 'REGULAR',
        billingPeriodKey: cycle.billingPeriodKey,
        billingPeriodLabel: cycle.billingPeriodLabel,
        issueDate: cycle.issueDate,
        dueDate: cycle.dueDate,
        status: 'DRAFT',
        billingHold: hold,
        billingPolicyApplied: policy,
        chargeLines,
        flatSnapshot: { flatNo: flat.flatNo, towerId: flat.towerId, floorId: flat.floorId, areaSqFt: flat.areaSqFt, occupancyStatus: flat.occupancyStatus },
        residentSnapshot: resident ? { name: resident.name, mobile: resident.mobile, email: resident.email } : undefined,
        subtotalPaise,
        totalDemandPaise: subtotalPaise,
        paidPaise: 0,
        outstandingPaise: subtotalPaise,
        version: 1,
        createdBy: actorUserId,
        updatedBy: actorUserId,
      }));
    }

    return {
      items: [...existing, ...created].sort((a, b) => String(a.flatSnapshot?.['flatNo'] || '').localeCompare(String(b.flatSnapshot?.['flatNo'] || ''))),
      createdCount: created.length,
      existingCount: existing.length,
    };
  }
}

export const demandDraftService = new DemandDraftService();
