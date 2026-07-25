import { logger } from '../../common/utils/logger';
import { IntervalScheduler } from '../../common/scheduler/intervalScheduler';
import { env } from '../../config/env';
import { visitorExpiryService } from './visitor.expiry.service';

class VisitorExpiryWorker {
  private scheduler?: IntervalScheduler;
  private status = {
    enabled: env.VISITOR_EXPIRY_WORKER_ENABLED,
    running: false,
    intervalMs: env.VISITOR_EXPIRY_WORKER_INTERVAL_MS,
    batchSize: env.VISITOR_EXPIRY_BATCH_SIZE,
    lastRunAt: undefined as Date | undefined,
    lastSuccessAt: undefined as Date | undefined,
    processedCount: 0,
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
      this.status.processedCount = await visitorExpiryService.expirePendingBatch(this.status.batchSize);
      this.status.lastSuccessAt = new Date();
      this.status.lastError = undefined;
      logger.info(`Visitor expiry worker processed ${this.status.processedCount} requests`);
    } catch (error: any) {
      this.status.lastError = error.message;
      logger.error('Visitor expiry worker failed', error);
    }
  }
}

export const visitorExpiryWorker = new VisitorExpiryWorker();
