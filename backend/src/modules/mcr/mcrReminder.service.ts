import { ConflictError, NotFoundError } from '../../common/errors/AppError';
import { MaintenanceDemand, IMaintenanceDemandDocument } from './demand.model';
import { mcrDemandDispatchService } from './mcrDemandDispatch.service';
import { mcrReminderRunSchema } from './mcrReminder.schemas';

export class McrReminderService {
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
