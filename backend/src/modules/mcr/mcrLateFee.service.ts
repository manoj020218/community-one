import { JwtPayload } from '../../common/types';
import { ChargeHead } from './chargeHead.model';
import { MaintenanceDemand } from './demand.model';
import { demandPublishService } from './demandPublish.service';
import { McrActorContext } from './mcr.access.service';
import { mcrLateFeeRunSchema } from './mcrLateFee.schemas';
import { McrSettings } from './mcrSettings.model';

function daysBetween(a: Date, b: Date) {
  return Math.floor((b.getTime() - a.getTime()) / 86400000);
}

export class McrLateFeeService {
  async runForSociety(societyId: string, input: unknown, actorUserId?: string) {
    const { asOfDate = new Date(), limit = 50 } = mcrLateFeeRunSchema.parse(input);
    const settings = await McrSettings.findOne({ societyId });
    if (!settings?.lateFeeEnabled || !settings.lateFeeAmountPaise) {
      return { processedCount: 0, generatedCount: 0, skippedCount: 0 };
    }

    const actorId = actorUserId || settings.updatedBy.toString();
    const eligible = await MaintenanceDemand.find({
      societyId,
      demandType: 'REGULAR',
      status: { $in: ['PUBLISHED', 'PARTIALLY_PAID', 'OVERDUE'] },
      outstandingPaise: { $gt: 0 },
      dueDate: { $lt: this.afterGraceDate(asOfDate, settings.gracePeriodDays) },
    }).sort({ dueDate: 1, createdAt: 1 }).limit(limit);
    const chargeHead = await this.ensureLateFeeChargeHead(societyId, actorId, settings.lateFeeAmountPaise);
    const context = this.systemContext(societyId, actorId);
    let generatedCount = 0;
    let skippedCount = 0;

    for (const demand of eligible) {
      const maxCycleIndex = this.resolveCycleIndex(demand.dueDate, asOfDate, settings.gracePeriodDays, settings.lateFeeIntervalDays);
      if (maxCycleIndex < 1) {
        skippedCount += 1;
        continue;
      }

      const existing = await MaintenanceDemand.find({ societyId, parentDemandId: demand._id, lateFeeCycleIndex: { $lte: maxCycleIndex } }).select('lateFeeCycleIndex');
      const existingCycles = new Set(existing.map((item) => item.lateFeeCycleIndex));
      let createdForDemand = 0;

      for (let lateFeeCycleIndex = 1; lateFeeCycleIndex <= maxCycleIndex; lateFeeCycleIndex += 1) {
        if (existingCycles.has(lateFeeCycleIndex)) continue;
        const lateFeeDemand = await MaintenanceDemand.create({
          societyId,
          billingPlanId: demand.billingPlanId,
          flatId: demand.flatId,
          demandType: 'LATE_FEE',
          parentDemandId: demand._id,
          lateFeeCycleIndex,
          billingPeriodKey: `${demand.billingPeriodKey}:LF:${lateFeeCycleIndex}`,
          billingPeriodLabel: `${demand.billingPeriodLabel} Late Fee ${lateFeeCycleIndex}`,
          issueDate: asOfDate,
          dueDate: asOfDate,
          status: 'DRAFT',
          chargeLines: [{
            chargeHeadId: chargeHead._id,
            chargeCode: chargeHead.code,
            chargeName: chargeHead.name,
            amountPaise: settings.lateFeeAmountPaise,
            calculationMethod: chargeHead.calculationMethod,
          }],
          flatSnapshot: demand.flatSnapshot,
          residentSnapshot: demand.residentSnapshot,
          subtotalPaise: settings.lateFeeAmountPaise,
          totalDemandPaise: settings.lateFeeAmountPaise,
          advanceAppliedPaise: 0,
          paidPaise: 0,
          outstandingPaise: settings.lateFeeAmountPaise,
          version: 1,
          createdBy: actorId,
          updatedBy: actorId,
        });
        await demandPublishService.publishExisting(context, lateFeeDemand, asOfDate);
        generatedCount += 1;
        createdForDemand += 1;
      }

      if (createdForDemand === 0) skippedCount += 1;
    }

    return { processedCount: eligible.length, generatedCount, skippedCount };
  }

  private async ensureLateFeeChargeHead(societyId: string, actorUserId: string, amountPaise: number) {
    const current = await ChargeHead.findOne({ societyId, code: 'LATEFEE' });
    if (current) return current;
    return ChargeHead.create({
      societyId,
      code: 'LATEFEE',
      name: 'Late Fee',
      category: 'PENALTY',
      isRecurring: false,
      defaultAmountPaise: amountPaise,
      calculationMethod: 'FIXED_FLAT',
      displayOrder: 999,
      createdBy: actorUserId,
      updatedBy: actorUserId,
    });
  }

  private resolveCycleIndex(dueDate: Date, asOfDate: Date, gracePeriodDays: number, lateFeeIntervalDays: number) {
    const overdueDays = daysBetween(dueDate, asOfDate) - gracePeriodDays;
    if (overdueDays <= 0) return 0;
    return Math.floor((overdueDays - 1) / lateFeeIntervalDays) + 1;
  }

  private afterGraceDate(asOfDate: Date, gracePeriodDays: number) {
    return new Date(asOfDate.getTime() - gracePeriodDays * 86400000);
  }

  private systemContext(societyId: string, actorUserId: string): McrActorContext {
    const user: JwtPayload = {
      userId: actorUserId,
      email: 'system@jenix.local',
      mobile: '0000000000',
      roleCode: 'SYSTEM',
      permissions: [],
      societyId,
    };
    return { societyId, user };
  }
}

export const mcrLateFeeService = new McrLateFeeService();
