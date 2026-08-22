import { ChargeHead } from './chargeHead.model';
import { BillingPlan } from './billingPlan.model';
import { MaintenanceDemand, IMaintenanceDemandDocument } from './demand.model';
import { Flat } from '../flat/flat.model';
import { Resident } from '../resident/resident.model';
import { McrOpeningBalance, IMcrOpeningBalanceDocument } from './mcrOpeningBalance.model';
import { McrActorContext } from './mcr.access.service';
import { demandPublishService } from './demandPublish.service';
import { setOpeningBalanceSchema, bulkOpeningDuesSchema } from './mcrOpeningBalance.schemas';
import { parseOrThrow } from './mcr.validation';

const OPENING_BALANCE_PERIOD_KEY = 'OPENING';
const OPENING_CHARGE_HEAD_CODE = 'OPENING-BAL';
const OPENING_BILLING_PLAN_NAME = 'Opening Balance / Legacy Dues';

export class McrOpeningBalanceService {
  async getBySociety(societyId: string): Promise<IMcrOpeningBalanceDocument | null> {
    return McrOpeningBalance.findOne({ societyId });
  }

  async setOpeningBalance(context: McrActorContext, input: unknown): Promise<IMcrOpeningBalanceDocument> {
    const dto = parseOrThrow(setOpeningBalanceSchema, input);
    return McrOpeningBalance.findOneAndUpdate(
      { societyId: context.societyId },
      {
        $set: {
          asOfDate: dto.asOfDate,
          openingCashPaise: dto.openingCashPaise,
          openingBankPaise: dto.openingBankPaise,
          updatedBy: context.user.userId,
        },
        $setOnInsert: { societyId: context.societyId, createdBy: context.user.userId },
      },
      { new: true, upsert: true }
    );
  }

  // Ensures the hidden system ChargeHead/BillingPlan pair exists for this society, creating
  // it on first use — lets legacy-dues demands flow through the normal demand pipeline
  // (payment allocation, receipts, reports) without billingPlanId ever needing to be
  // optional anywhere else in the codebase.
  private async ensureSystemBillingPlan(context: McrActorContext, opening: IMcrOpeningBalanceDocument): Promise<{ billingPlanId: string; chargeHeadId: string }> {
    if (opening.systemBillingPlanId && opening.systemChargeHeadId) {
      return { billingPlanId: opening.systemBillingPlanId, chargeHeadId: opening.systemChargeHeadId };
    }

    let chargeHead = await ChargeHead.findOne({ societyId: context.societyId, code: OPENING_CHARGE_HEAD_CODE });
    if (!chargeHead) {
      chargeHead = await ChargeHead.create({
        societyId: context.societyId,
        code: OPENING_CHARGE_HEAD_CODE,
        name: 'Opening Balance (Legacy Dues)',
        description: 'System charge head for one-time pending dues carried forward from before this platform was adopted.',
        category: 'OTHER',
        isRecurring: false,
        defaultAmountPaise: 0,
        calculationMethod: 'FIXED_FLAT',
        isActive: true,
        displayOrder: -1,
        createdBy: context.user.userId,
        updatedBy: context.user.userId,
      });
    }

    let billingPlan = await BillingPlan.findOne({ societyId: context.societyId, name: OPENING_BILLING_PLAN_NAME });
    if (!billingPlan) {
      billingPlan = await BillingPlan.create({
        societyId: context.societyId,
        name: OPENING_BILLING_PLAN_NAME,
        frequency: 'ONE_TIME',
        billingDay: 1,
        dueDay: 0,
        chargeLines: [{ chargeHeadId: chargeHead._id, amountPaise: 0, calculationMethod: 'FIXED_FLAT' }],
        effectiveFrom: opening.asOfDate,
        autoGenerate: false,
        autoPublish: false,
        isActive: true,
        version: 1,
        createdBy: context.user.userId,
        updatedBy: context.user.userId,
      });
    }

    opening.systemBillingPlanId = billingPlan._id!.toString();
    opening.systemChargeHeadId = chargeHead._id!.toString();
    await opening.save();

    return { billingPlanId: billingPlan._id!.toString(), chargeHeadId: chargeHead._id!.toString() };
  }

  // Idempotent — re-running for the same flats skips ones that already have an opening-
  // balance demand rather than erroring, so an admin can safely add more flats in a second
  // pass without needing to remember exactly who they already entered.
  async bulkCreateOpeningDues(context: McrActorContext, input: unknown): Promise<{ createdCount: number; skippedCount: number; items: IMaintenanceDemandDocument[] }> {
    const dto = parseOrThrow(bulkOpeningDuesSchema, input);
    let opening = await this.getBySociety(context.societyId);
    if (!opening) {
      opening = await McrOpeningBalance.create({
        societyId: context.societyId,
        asOfDate: dto.asOfDate,
        openingCashPaise: 0,
        openingBankPaise: 0,
        createdBy: context.user.userId,
        updatedBy: context.user.userId,
      });
    }
    const { billingPlanId, chargeHeadId } = await this.ensureSystemBillingPlan(context, opening);

    const flatIds = dto.entries.map((e) => e.flatId);
    const flats = await Flat.find({ _id: { $in: flatIds }, societyId: context.societyId });
    const flatMap = new Map(flats.map((f) => [f._id.toString(), f]));

    const existing = await MaintenanceDemand.find({
      societyId: context.societyId,
      billingPlanId,
      billingPeriodKey: OPENING_BALANCE_PERIOD_KEY,
      flatId: { $in: flatIds },
    });
    const existingFlatIds = new Set(existing.map((d) => d.flatId.toString()));

    const residents = await Resident.find({ societyId: context.societyId, flatId: { $in: flatIds }, primaryContact: true, status: 'ACTIVE' });
    const residentMap = new Map(residents.map((r) => [r.flatId.toString(), r]));

    const created: IMaintenanceDemandDocument[] = [];
    let skippedCount = 0;

    for (const entry of dto.entries) {
      if (existingFlatIds.has(entry.flatId)) { skippedCount += 1; continue; }
      const flat = flatMap.get(entry.flatId);
      if (!flat) { skippedCount += 1; continue; }

      const resident = residentMap.get(entry.flatId);
      const demand = await MaintenanceDemand.create({
        societyId: context.societyId,
        billingPlanId,
        flatId: flat._id,
        demandType: 'OPENING_BALANCE',
        billingPeriodKey: OPENING_BALANCE_PERIOD_KEY,
        billingPeriodLabel: 'Opening Balance',
        issueDate: dto.asOfDate,
        dueDate: dto.asOfDate,
        status: 'DRAFT',
        chargeLines: [{
          chargeHeadId,
          chargeCode: OPENING_CHARGE_HEAD_CODE,
          chargeName: 'Opening Balance (Legacy Dues)',
          amountPaise: entry.amountPaise,
          calculationMethod: 'FIXED_FLAT',
        }],
        flatSnapshot: { flatNo: flat.flatNo, towerId: flat.towerId, floorId: flat.floorId, areaSqFt: flat.areaSqFt, occupancyStatus: flat.occupancyStatus },
        residentSnapshot: resident ? { name: resident.name, mobile: resident.mobile, email: resident.email } : undefined,
        subtotalPaise: entry.amountPaise,
        totalDemandPaise: entry.amountPaise,
        paidPaise: 0,
        outstandingPaise: entry.amountPaise,
        version: 1,
        createdBy: context.user.userId,
        updatedBy: context.user.userId,
      });

      // Publish immediately (evaluated as of *now*, not the historical as-of date, so a
      // legacy due whose date is already in the past correctly lands as OVERDUE rather than
      // a fresh PUBLISHED bill that looks like it was just issued) — these are real,
      // already-owed dues, not a future bill to hold.
      const published = await demandPublishService.publishExisting(context, demand);
      created.push(published);
    }

    return { createdCount: created.length, skippedCount, items: created };
  }
}

export const mcrOpeningBalanceService = new McrOpeningBalanceService();
