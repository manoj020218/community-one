import { IntervalScheduler } from '../../common/scheduler/intervalScheduler';
import { logger } from '../../common/utils/logger';
import { env } from '../../config/env';
import { samaScheduledSyncService } from './samaScheduledSync.service';

class SamaScheduledSyncWorker {
  private scheduler?: IntervalScheduler;
  private status = {
    enabled: env.SAMA_SYNC_WORKER_ENABLED,
    running: false,
    intervalMs: env.SAMA_SYNC_WORKER_INTERVAL_MS,
    batchSize: env.SAMA_SYNC_WORKER_BATCH_SIZE,
    lastRunAt: undefined as Date | undefined,
    lastSuccessAt: undefined as Date | undefined,
    dueSocietyCount: 0,
    executedSyncCount: 0,
    failedSyncCount: 0,
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
      const result = await samaScheduledSyncService.runDue(this.status.batchSize);
      this.status.dueSocietyCount = Number(result.dueSocietyCount || 0);
      this.status.executedSyncCount = Number(result.executedSyncCount || 0);
      this.status.failedSyncCount = Number(result.failedSyncCount || 0);
      this.status.lastSuccessAt = new Date();
      this.status.lastError = undefined;
      logger.info(`SAMA scheduled sync worker processed ${this.status.dueSocietyCount} societies and executed ${this.status.executedSyncCount} sync jobs`);
    } catch (error: any) {
      this.status.lastError = error.message;
      logger.error('SAMA scheduled sync worker failed', error);
    }
  }
}

export const samaScheduledSyncWorker = new SamaScheduledSyncWorker();
