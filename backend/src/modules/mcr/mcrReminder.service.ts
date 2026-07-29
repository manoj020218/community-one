import { ConflictError, NotFoundError } from '../../common/errors/AppError';
import { logger } from '../../common/utils/logger';
import { MaintenanceDemand, IMaintenanceDemandDocument } from './demand.model';
import { mcrDemandDispatchService } from './mcrDemandDispatch.service';
import { mcrReminderRunSchema } from './mcrReminder.schemas';
import { McrSettings, IMcrSettingsDocument } from './mcrSettings.model';

function partsInTimezone(date: Date, timezone: string): { dateKey: string; hhmm: string } {
  const fmt = new Intl.DateTimeFormat('en-GB', {
    timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false,
  });
  const parts = fmt.formatToParts(date).reduce((acc, p) => { acc[p.type] = p.value; return acc; }, {} as Record<string, string>);
  return { dateKey: `${parts.year}-${parts.month}-${parts.day}`, hhmm: `${parts.hour}:${parts.minute}` };
}

function daysBetween(fromDateKey: string, toDateKey: string): number {
  return Math.round((Date.parse(`${toDateKey}T00:00:00Z`) - Date.parse(`${fromDateKey}T00:00:00Z`)) / 86400000);
}

export class McrReminderService {
  /** Is this society due for its next automated reminder run, per its own configured
   * frequency/time-of-day? Never fires more than once on the same calendar day (in the
   * society's own timezone), and only after the configured time has passed. */
  isDueForAutomatedRun(settings: IMcrSettingsDocument, now: Date = new Date()): boolean {
    if (!settings.reminderAutomationEnabled) return false;
    const { dateKey, hhmm } = partsInTimezone(now, settings.societyTimezone || 'Asia/Kolkata');
    if (settings.reminderLastRunDate === dateKey) return false;
    if (hhmm < (settings.reminderTimeOfDay || '10:00')) return false;
    if (!settings.reminderLastRunDate) return true;
    return daysBetween(settings.reminderLastRunDate, dateKey) >= (settings.reminderFrequencyDays || 1);
  }

  async runDueAutomatedReminders(societyIds: string[], batchSize: number): Promise<{ processedSocietyCount: number; sentCount: number }> {
    let processedSocietyCount = 0;
    let sentCount = 0;
    for (const societyId of societyIds) {
      const settings = await McrSettings.findOne({ societyId });
      if (!settings || !this.isDueForAutomatedRun(settings)) continue;

      const { dateKey } = partsInTimezone(new Date(), settings.societyTimezone || 'Asia/Kolkata');
      try {
        const result = await this.runOutstandingReminders(societyId, { limit: batchSize, channels: ['IN_APP', 'EMAIL', 'WHATSAPP'] });
        sentCount += result.sentCount;
        processedSocietyCount += 1;
      } catch (error: any) {
        logger.error('Automated MCR reminder run failed for society', { societyId, err: error?.message });
      } finally {
        // Mark today as done regardless of outcome — a mid-run failure shouldn't cause
        // retries every polling tick for the rest of the day.
        await McrSettings.updateOne({ societyId }, { $set: { reminderLastRunDate: dateKey } });
      }
    }
    return { processedSocietyCount, sentCount };
  }
  async sendDemandReminder(societyId: string, demandId: string, input: unknown = {}) {
    const { channels = ['IN_APP'] } = mcrReminderRunSchema.partial({ dueBefore: true, limit: true }).parse(input);
    const demand = await MaintenanceDemand.findOne({ _id: demandId, societyId });
    if (!demand) throw new NotFoundError('MaintenanceDemand');
    if (demand.status === 'DRAFT' || demand.status === 'CANCELLED') throw new ConflictError('Only active demands can receive reminders');
    if (demand.outstandingPaise <= 0) throw new ConflictError('No outstanding amount remains for this demand');

    await this.markOverdueIfNeeded(demand);
    return mcrDemandDispatchService.sendReminder(societyId, demandId, channels);
  }

  async runOutstandingReminders(societyId: string, input: unknown) {
    const { dueBefore = new Date(), limit = 50, channels = ['IN_APP'] } = mcrReminderRunSchema.parse(input);
    const demands = await MaintenanceDemand.find({
      societyId,
      status: { $in: ['PUBLISHED', 'PARTIALLY_PAID', 'OVERDUE'] },
      outstandingPaise: { $gt: 0 },
      dueDate: { $lte: dueBefore },
    }).sort({ dueDate: 1, createdAt: 1 }).limit(limit);

    let sentCount = 0;
    let skippedCount = 0;
    let duplicateCount = 0;
    for (const demand of demands) {
      const result = await this.sendDemandReminder(societyId, demand._id!.toString(), { channels });
      sentCount += result.sentCount;
      skippedCount += result.skippedCount;
      duplicateCount += result.duplicateCount;
    }

    return { processedCount: demands.length, sentCount, skippedCount, duplicateCount };
  }

  private async markOverdueIfNeeded(demand: IMaintenanceDemandDocument) {
    if (demand.dueDate < new Date() && demand.outstandingPaise > 0 && demand.status !== 'OVERDUE') {
      demand.status = 'OVERDUE';
      await demand.save();
    }
  }
}

export const mcrReminderService = new McrReminderService();
