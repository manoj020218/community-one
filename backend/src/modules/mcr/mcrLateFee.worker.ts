import { IntervalScheduler } from '../../common/scheduler/intervalScheduler';
import { logger } from '../../common/utils/logger';
import { env } from '../../config/env';
import { SocietyModuleConfig } from '../moduleRegistry/moduleRegistry.model';
import { mcrLateFeeService } from './mcrLateFee.service';

class McrLateFeeWorker {
  private scheduler?: IntervalScheduler;
  private status = {
    enabled: env.MCR_LATE_FEE_WORKER_ENABLED,
    running: false,
    intervalMs: env.MCR_LATE_FEE_WORKER_INTERVAL_MS,
    batchSize: env.MCR_LATE_FEE_BATCH_SIZE,
    lastRunAt: undefined as Date | undefined,
    lastSuccessAt: undefined as Date | undefined,
    processedSocietyCount: 0,
    generatedCount: 0,
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
      let generatedCount = 0;
      for (const item of societies) {
        const result = await mcrLateFeeService.runForSociety(item.societyId.toString(), { limit: this.status.batchSize });
        generatedCount += result.generatedCount;
      }

      this.status.processedSocietyCount = societies.length;
      this.status.generatedCount = generatedCount;
      this.status.lastSuccessAt = new Date();
      this.status.lastError = undefined;
      logger.info(`MCR late fee worker processed ${societies.length} societies and generated ${generatedCount} late fee demands`);
    } catch (error: any) {
      this.status.lastError = error.message;
      logger.error('MCR late fee worker failed', error);
    }
  }
}

export const mcrLateFeeWorker = new McrLateFeeWorker();
