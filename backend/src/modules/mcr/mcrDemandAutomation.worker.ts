import { IntervalScheduler } from '../../common/scheduler/intervalScheduler';
import { logger } from '../../common/utils/logger';
import { env } from '../../config/env';
import { SocietyModuleConfig } from '../moduleRegistry/moduleRegistry.model';
import { mcrDemandAutomationService } from './mcrDemandAutomation.service';

class McrDemandAutomationWorker {
  private scheduler?: IntervalScheduler;
  private status = {
    enabled: env.MCR_DEMAND_WORKER_ENABLED,
    running: false,
    intervalMs: env.MCR_DEMAND_WORKER_INTERVAL_MS,
    cycleLimit: env.MCR_DEMAND_WORKER_CYCLE_LIMIT,
    lastRunAt: undefined as Date | undefined,
    lastSuccessAt: undefined as Date | undefined,
    processedSocietyCount: 0,
    generatedDemandCount: 0,
    publishedDemandCount: 0,
    lastError: undefined as string | undefined,
  };

  start(): void {
    if (!this.status.enabled || this.scheduler) return;
    this.scheduler = new IntervalScheduler(() => this.runOnce(), this.status.intervalMs);
    this.scheduler.start();
    this.status.running = true;
  }

  stop(): void {
    this.scheduler?.stop();
    this.scheduler = undefined;
    this.status.running = false;
  }

  getStatus() {
    return { ...this.status };
  }

  private async runOnce(): Promise<void> {
    this.status.lastRunAt = new Date();
    try {
      const societies = await SocietyModuleConfig.find({ moduleCode: 'MCR', isEnabled: true }).select('societyId');
      let generatedDemandCount = 0;
      let publishedDemandCount = 0;
      for (const item of societies) {
        const result = await mcrDemandAutomationService.runForSociety(item.societyId.toString(), { limit: this.status.cycleLimit });
        generatedDemandCount += result.generatedDemandCount;
        publishedDemandCount += result.publishedDemandCount;
      }

      this.status.processedSocietyCount = societies.length;
      this.status.generatedDemandCount = generatedDemandCount;
      this.status.publishedDemandCount = publishedDemandCount;
      this.status.lastSuccessAt = new Date();
      this.status.lastError = undefined;
      logger.info(`MCR demand worker processed ${societies.length} societies, generated ${generatedDemandCount}, published ${publishedDemandCount}`);
    } catch (error: any) {
      this.status.lastError = error.message;
      logger.error('MCR demand worker failed', error);
    }
  }
}

export const mcrDemandAutomationWorker = new McrDemandAutomationWorker();
