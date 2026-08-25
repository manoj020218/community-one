import { logger } from '../../common/utils/logger';
import { IntervalScheduler } from '../../common/scheduler/intervalScheduler';
import { patrolRoundService } from './patrolRound.service';

// Sweeps rounds left IN_PROGRESS well past any reasonable shift so they don't linger
// forever and skew Hit/Miss stats. Fixed 15-minute cadence — low-stakes enough not to need
// its own env-configurable interval like the busier workers (visitor expiry, MCR reminders).
const INTERVAL_MS = 15 * 60 * 1000;
const MAX_AGE_HOURS = 12;

class PatrolRoundWorker {
  private scheduler?: IntervalScheduler;
  private status = {
    enabled: true,
    running: false,
    intervalMs: INTERVAL_MS,
    lastRunAt: undefined as Date | undefined,
    lastSuccessAt: undefined as Date | undefined,
    abandonedCount: 0,
    lastError: undefined as string | undefined,
  };

  start(): void {
    if (this.scheduler) return;
    this.scheduler = new IntervalScheduler(() => this.runOnce(), INTERVAL_MS);
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
      this.status.abandonedCount = await patrolRoundService.abandonStaleRounds(MAX_AGE_HOURS);
      this.status.lastSuccessAt = new Date();
      this.status.lastError = undefined;
      if (this.status.abandonedCount > 0) logger.info(`Patrol round worker abandoned ${this.status.abandonedCount} stale round(s)`);
    } catch (error: any) {
      this.status.lastError = error.message;
      logger.error('Patrol round worker failed', error);
    }
  }
}

export const patrolRoundWorker = new PatrolRoundWorker();
