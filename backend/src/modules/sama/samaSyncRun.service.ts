import { buildPaginatedResult, parsePagination } from '../../common/utils/response';
import { SamaActorContext } from './sama.access.service';
import { ISamaSyncRunDocument, SamaSyncRun } from './samaSyncRun.model';

export class SamaSyncRunService {
  async start(context: SamaActorContext, syncType: string, filters?: Record<string, unknown>): Promise<ISamaSyncRunDocument> {
    return SamaSyncRun.create({
      societyId: context.societyId,
      provider: 'EDGEFOLIO',
      syncType,
      status: 'RUNNING',
      triggerMode: 'MANUAL',
      filters,
      triggeredBy: context.user.userId,
      attemptCount: 1,
      startedAt: new Date(),
    });
  }

  async startScheduled(societyId: string, syncType: string, filters?: Record<string, unknown>): Promise<ISamaSyncRunDocument> {
    return SamaSyncRun.create({
      societyId,
      provider: 'EDGEFOLIO',
      syncType,
      status: 'RUNNING',
      triggerMode: 'SCHEDULED',
      filters,
      attemptCount: 1,
      startedAt: new Date(),
    });
  }

  async startRetry(context: SamaActorContext, previousRun: ISamaSyncRunDocument): Promise<ISamaSyncRunDocument> {
    return SamaSyncRun.create({
      societyId: context.societyId,
      provider: 'EDGEFOLIO',
      syncType: previousRun.syncType,
      status: 'RUNNING',
      triggerMode: 'MANUAL',
      filters: previousRun.filters,
      triggeredBy: context.user.userId,
      retryOfSyncRunId: previousRun._id,
      attemptCount: Number(previousRun.attemptCount || 1) + 1,
      startedAt: new Date(),
    });
  }

  async finishSuccess(runId: string, result: Record<string, unknown>): Promise<void> {
    await SamaSyncRun.findByIdAndUpdate(runId, {
      $set: {
        status: 'SUCCESS',
        completedAt: new Date(),
        importedCount: Number(result.importedCount || 0),
        createdCount: Number(result.createdCount || 0),
        updatedCount: Number(result.updatedCount || 0),
      },
    });
  }

  async finishFailure(runId: string, message: string): Promise<void> {
    await SamaSyncRun.findByIdAndUpdate(runId, {
      $set: { status: 'FAILED', completedAt: new Date(), errorMessage: message.slice(0, 300) },
    });
  }

  async listBySociety(societyId: string, query: Record<string, unknown>) {
    const { page, limit, skip } = parsePagination(query);
    const filter: Record<string, unknown> = { societyId };
    if (typeof query.syncType === 'string' && query.syncType) filter.syncType = query.syncType;
    if (typeof query.status === 'string' && query.status) filter.status = query.status;

    const [items, total] = await Promise.all([
      SamaSyncRun.find(filter).sort({ startedAt: -1 }).skip(skip).limit(limit),
      SamaSyncRun.countDocuments(filter),
    ]);

    return buildPaginatedResult(items, total, page, limit);
  }

  async findByIdForSociety(societyId: string, runId: string): Promise<ISamaSyncRunDocument> {
    return SamaSyncRun.findOne({ _id: runId, societyId }).orFail();
  }
}

export const samaSyncRunService = new SamaSyncRunService();
