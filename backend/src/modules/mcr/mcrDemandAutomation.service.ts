import { BillingPlan } from './billingPlan.model';
import { demandDraftService } from './demandDraft.service';
import { demandPublishService } from './demandPublish.service';
import { mcrBillingCycleService } from './mcrBillingCycle.service';
import { mcrDemandAutomationRunSchema } from './mcrDemandAutomation.schemas';
import { parseOrThrow } from './mcr.validation';

export class McrDemandAutomationService {
  async runForSociety(societyId: string, input: unknown, actorUserId?: string) {
    const dto = parseOrThrow(mcrDemandAutomationRunSchema, input || {});
    const plans = await BillingPlan.find({
      societyId,
      isActive: true,
      $or: [{ autoGenerate: true }, { autoPublish: true }],
      effectiveFrom: { $lte: dto.asOf },
    }).sort({ effectiveFrom: 1, name: 1 });
    const results = [];
    let generatedDemandCount = 0;
    let publishedDemandCount = 0;
    let processedCycleCount = 0;
    let skippedCycleCount = 0;

    for (const plan of plans) {
      const runAsUserId = actorUserId || plan.updatedBy?.toString() || plan.createdBy?.toString();
      const cycles = mcrBillingCycleService.listDueCycles(plan, dto.asOf, dto.limit);
      let planGenerated = 0;
      let planPublished = 0;
      const cycleResults = [];

      for (const cycle of cycles) {
        const draftResult = await demandDraftService.createScheduledDrafts(societyId, plan._id!.toString(), cycle, runAsUserId);
        const drafts = draftResult.items.filter((item) => item.billingPeriodKey === cycle.billingPeriodKey && item.status === 'DRAFT');
        // billingHold demands (Vacant/Builder-Unsold flats under an EXEMPT policy) stay in
        // DRAFT even when autoPublish is on — they're an accrual record, not an active bill,
        // until an admin manually publishes one as a deliberate override.
        const publishableDrafts = drafts.filter((item) => !item.billingHold);
        let publishedCount = 0;

        if (plan.autoPublish) {
          for (const draft of publishableDrafts) {
            await demandPublishService.publishSystem(societyId, draft._id!.toString(), runAsUserId, dto.asOf);
            publishedCount += 1;
          }
        }

        processedCycleCount += 1;
        generatedDemandCount += draftResult.createdCount;
        publishedDemandCount += publishedCount;
        planGenerated += draftResult.createdCount;
        planPublished += publishedCount;
        if (!draftResult.createdCount && !publishedCount) skippedCycleCount += 1;
        cycleResults.push({
          billingPeriodKey: cycle.billingPeriodKey,
          createdCount: draftResult.createdCount,
          existingCount: draftResult.existingCount,
          publishedCount,
        });
      }

      results.push({
        billingPlanId: plan._id!.toString(),
        name: plan.name,
        frequency: plan.frequency,
        cycleCount: cycles.length,
        generatedCount: planGenerated,
        publishedCount: planPublished,
        cycles: cycleResults,
      });
    }

    return {
      asOf: dto.asOf,
      processedPlanCount: plans.length,
      processedCycleCount,
      generatedDemandCount,
      publishedDemandCount,
      skippedCycleCount,
      plans: results,
    };
  }
}

export const mcrDemandAutomationService = new McrDemandAutomationService();
