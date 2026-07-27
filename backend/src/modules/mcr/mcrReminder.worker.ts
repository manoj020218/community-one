import { IntervalScheduler } from '../../common/scheduler/intervalScheduler';
import { logger } from '../../common/utils/logger';
import { env } from '../../config/env';
import { SocietyModuleConfig } from '../moduleRegistry/moduleRegistry.model';
import { mcrReminderService } from './mcrReminder.service';

class McrReminderWorker {
  private scheduler?: IntervalScheduler;
  private status = {
    enabled: env.MCR_REMINDER_WORKER_ENABLED,
    running: false,
    intervalMs: env.MCR_REMINDER_WORKER_INTERVAL_MS,
    batchSize: env.MCR_REMINDER_BATCH_SIZE,
    lastRunAt: undefined as Date | undefined,
    lastSuccessAt: undefined as Date | undefined,
    processedSocietyCount: 0,
    sentCount: 0,
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
      let sentCount = 0;
      for (const item of societies) {
        const result = await mcrReminderService.runOutstandingReminders(item.societyId.toString(), { limit: this.status.batchSize, channels: ['IN_APP', 'EMAIL', 'WHATSAPP'] });
        sentCount += result.sentCount;
      }

      this.status.processedSocietyCount = societies.length;
      this.status.sentCount = sentCount;
      this.status.lastSuccessAt = new Date();
      this.status.lastError = undefined;
      logger.info(`MCR reminder worker processed ${societies.length} societies and sent ${sentCount} reminders`);
    } catch (error: any) {
      this.status.lastError = error.message;
      logger.error('MCR reminder worker failed', error);
    }
  }
}

export const mcrReminderWorker = new McrReminderWorker();
