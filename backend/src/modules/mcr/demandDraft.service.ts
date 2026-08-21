import { Flat } from '../flat/flat.model';
import { Resident } from '../resident/resident.model';
import { BillingPlan, IBillingPlanDocument } from './billingPlan.model';
import { ChargeHead } from './chargeHead.model';
import { McrActorContext } from './mcr.access.service';
import { MaintenanceDemand, IMaintenanceDemandDocument } from './demand.model';
import { demandDraftCreateSchema } from './demand.schemas';
import { McrBillingCycle, mcrBillingCycleService } from './mcrBillingCycle.service';
import { parseOrThrow } from './mcr.validation';

export class DemandDraftService {
  async listBySociety(societyId: string, status?: string): Promise<IMaintenanceDemandDocument[]> {
    const query: Record<string, unknown> = { societyId };
    if (status) query.status = status;
    return MaintenanceDemand.find(query).sort({ createdAt: -1 });
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
    return this.createForPlan(context.societyId, billingPlan, cycle, context.user.userId, dto.flatIds);
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
    // kept billing deleted flats forever.
    const flatQuery: Record<string, unknown> = { societyId, isActive: true };
    if (flatIds?.length) flatQuery._id = { $in: flatIds };
    const flats = await Flat.find(flatQuery).sort({ flatNo: 1 });
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
      const chargeLines = billingPlan.chargeLines.map((line) => {
        const chargeHead = chargeHeadMap.get(line.chargeHeadId.toString());
        return {
          chargeHeadId: line.chargeHeadId,
          chargeCode: chargeHead?.code || 'UNKNOWN',
          chargeName: chargeHead?.name || 'Unknown Charge Head',
          amountPaise: line.amountPaise,
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
        chargeLines,
        flatSnapshot: { flatNo: flat.flatNo, towerId: flat.towerId, floorId: flat.floorId, areaSqFt: flat.areaSqFt },
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
