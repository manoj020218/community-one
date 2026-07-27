import { env } from '../../config/env';
import { SamaActorContext } from './sama.access.service';
import { SamaSource } from './samaSource.model';
import { samaNotificationService } from './samaNotification.service';
import { samaSourceService } from './samaSource.service';
import { samaBridgeSyncService } from './samaBridgeSync.service';
import { samaAccessEventService } from './samaAccessEvent.service';
import { samaSyncRunService } from './samaSyncRun.service';
import { samaSyncService } from './samaSync.service';

type ScheduledSyncType = 'EMPLOYEES' | 'ATTENDANCE' | 'LEAVES' | 'SHIFTS' | 'PAYROLL' | 'ACCESS_EVENTS';

function systemContext(societyId: string): SamaActorContext {
  return {
    societyId,
    user: { userId: '000000000000000000000000', email: 'system@jenix.local', mobile: '0000000000', roleCode: 'SYSTEM', permissions: [] },
  };
}

export class SamaScheduledSyncService {
  async runDue(limit: number = env.SAMA_SYNC_WORKER_BATCH_SIZE): Promise<Record<string, unknown>> {
    const dueSources = await samaSourceService.listDueScheduledSources(limit);
    return this.execute(dueSources.map((item) => item.societyId.toString()));
  }

  async runDueForSociety(societyId: string): Promise<Record<string, unknown>> {
    const source = await SamaSource.findOne({ societyId, provider: 'EDGEFOLIO', isActive: true, syncScheduleEnabled: true });
    if (!source || !this.isDue(source)) return this.summary(0, 0, 0, 0, 0);
    return this.execute([societyId]);
  }

  private async execute(societyIds: string[]): Promise<Record<string, unknown>> {
    let executedSyncCount = 0;
    let failedSyncCount = 0;
    let attentionSocietyCount = 0;
    for (const societyId of societyIds) {
      const source = await SamaSource.findOne({ societyId, provider: 'EDGEFOLIO', isActive: true, syncScheduleEnabled: true });
      if (!source) continue;
      for (const syncType of source.scheduledSyncTypes as ScheduledSyncType[]) {
        const run = await samaSyncRunService.startScheduled(societyId, syncType, { scheduled: true });
        try {
          const result = await this.runWithRetry(systemContext(societyId), syncType, Number(source.syncRetryLimit || 2));
          await samaSyncRunService.finishSuccess(run._id.toString(), result);
          executedSyncCount += 1;
        } catch (error: any) {
          await samaSyncRunService.finishFailure(run._id.toString(), error.message || 'Scheduled SAMA sync failed');
          failedSyncCount += 1;
        }
      }
      await samaSourceService.markScheduledSyncRun(societyId);
      attentionSocietyCount += await this.notifyIfAttentionNeeded(societyId, source.lastSyncAlertAt || null);
    }
    return this.summary(societyIds.length, societyIds.length, executedSyncCount, failedSyncCount, attentionSocietyCount);
  }

  private async runSyncType(context: SamaActorContext, syncType: ScheduledSyncType): Promise<Record<string, unknown>> {
    if (syncType === 'EMPLOYEES') return samaSyncService.syncEmployees(context);
    if (syncType === 'ATTENDANCE') return samaSyncService.syncAttendance(context);
    if (syncType === 'LEAVES') return samaBridgeSyncService.syncLeaves(context);
    if (syncType === 'SHIFTS') return samaBridgeSyncService.syncShifts(context);
    if (syncType === 'PAYROLL') return samaBridgeSyncService.syncPayroll(context);
    return samaAccessEventService.syncAccessEvents(context, 200);
  }

  private async runWithRetry(context: SamaActorContext, syncType: ScheduledSyncType, retryLimit: number) {
    let lastError: unknown;
    for (let attempt = 1; attempt <= retryLimit; attempt += 1) {
      try {
        return await this.runSyncType(context, syncType);
      } catch (error) {
        lastError = error;
      }
    }
    throw lastError;
  }

  private isDue(source: any): boolean {
    if (!source.lastScheduledSyncAt) return true;
    return Date.now() - new Date(source.lastScheduledSyncAt).getTime() >= Number(source.syncIntervalMinutes || 60) * 60_000;
  }

  private async notifyIfAttentionNeeded(societyId: string, lastSyncAlertAt?: Date | null) {
    const health = await samaSourceService.getHealthBySociety(societyId);
    if (health.overallStatus === 'OK') return 0;
    const lastAlertAgeMs = lastSyncAlertAt ? Date.now() - new Date(lastSyncAlertAt).getTime() : Number.POSITIVE_INFINITY;
    if (lastAlertAgeMs < 30 * 60_000) return 0;
    await samaNotificationService.notifySocietyRoles(societyId, ['SOCIETY_ADMIN', 'FACILITY_MANAGER'], {
      title: 'SAMA sync requires attention',
      message: `SAMA sync health is ${String(health.overallStatus).toLowerCase()} for this society.`,
      actionUrl: '/sama/reports/sync-health',
      entityType: 'SamaSource',
      type: 'WARNING',
      priority: 'HIGH',
      metadata: { staleSyncTypes: health.staleSyncTypes, consecutiveSyncFailures: health.consecutiveSyncFailures },
    });
    await samaSourceService.markAlertSent(societyId);
    return 1;
  }

  private summary(dueSocietyCount: number, processedSocietyCount: number, executedSyncCount: number, failedSyncCount: number, attentionSocietyCount: number) {
    return { dueSocietyCount, processedSocietyCount, executedSyncCount, failedSyncCount, attentionSocietyCount, syncedAt: new Date() };
  }
}

export const samaScheduledSyncService = new SamaScheduledSyncService();
