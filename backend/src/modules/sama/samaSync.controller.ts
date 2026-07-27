import { NextFunction, Response } from 'express';
import { AuthenticatedRequest } from '../../common/types';
import { sendSuccess } from '../../common/utils/response';
import { auditService } from '../audit/audit.service';
import { samaAccessService } from './sama.access.service';
import { samaAccessEventService } from './samaAccessEvent.service';
import { samaBridgeSyncService } from './samaBridgeSync.service';
import { samaScheduledSyncService } from './samaScheduledSync.service';
import {
  samaAccessEventSyncSchema,
  samaAttendanceSyncSchema,
  samaEmployeeSyncSchema,
  samaLeaveSyncSchema,
  samaPayrollSyncSchema,
  samaRetrySyncRunSchema,
  samaRunDueSyncSchema,
  samaShiftSyncSchema,
} from './samaSync.schemas';
import { samaSyncService } from './samaSync.service';
import { samaSyncRunService } from './samaSyncRun.service';
import { parseOrThrow } from './sama.validation';

export class SamaSyncController {
  async syncEmployees(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    await this.runSync(req, res, next, 'EMPLOYEES', samaEmployeeSyncSchema, 'SAMA employees synced', (context) => samaSyncService.syncEmployees(context));
  }

  async syncAttendance(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    await this.runSync(
      req,
      res,
      next,
      'ATTENDANCE',
      samaAttendanceSyncSchema,
      'SAMA attendance synced',
      (context, payload) => samaSyncService.syncAttendance(context, typeof payload.date === 'string' ? payload.date : undefined)
    );
  }

  async syncLeaves(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    await this.runSync(req, res, next, 'LEAVES', samaLeaveSyncSchema, 'SAMA leaves synced', (context) => samaBridgeSyncService.syncLeaves(context));
  }

  async syncShifts(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    await this.runSync(req, res, next, 'SHIFTS', samaShiftSyncSchema, 'SAMA shifts synced', (context) => samaBridgeSyncService.syncShifts(context));
  }

  async syncPayroll(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    await this.runSync(
      req,
      res,
      next,
      'PAYROLL',
      samaPayrollSyncSchema,
      'SAMA payroll synced',
      (context, payload) => samaBridgeSyncService.syncPayroll(context, typeof payload.monthKey === 'string' ? payload.monthKey : undefined)
    );
  }

  async syncAccessEvents(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    await this.runSync(
      req,
      res,
      next,
      'ACCESS_EVENTS',
      samaAccessEventSyncSchema,
      'SAMA access events synced',
      (context, payload) => samaAccessEventService.syncAccessEvents(context, typeof payload.limit === 'number' ? payload.limit : 100)
    );
  }

  async runDue(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const payload = parseOrThrow(samaRunDueSyncSchema, req.body || {});
      const context = await samaAccessService.getActorContext(req.user!, payload.societyId);
      sendSuccess(res, await samaScheduledSyncService.runDueForSociety(context.societyId), 'SAMA scheduled syncs processed');
    } catch (error) {
      next(error);
    }
  }

  async retryRun(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    let syncRunId: string | undefined;
    try {
      const payload = parseOrThrow(samaRetrySyncRunSchema, req.body || {});
      const context = await samaAccessService.getActorContext(req.user!, payload.societyId);
      const previousRun = await samaSyncRunService.findByIdForSociety(context.societyId, req.params.runId);
      const syncRun = await samaSyncRunService.startRetry(context, previousRun);
      syncRunId = syncRun._id.toString();
      const result = await this.runSyncType(context, previousRun.syncType, (previousRun.filters || {}) as Record<string, unknown>);
      await samaSyncRunService.finishSuccess(syncRunId, result);
      sendSuccess(res, result, 'SAMA sync run retried');
    } catch (error: any) {
      if (syncRunId) await samaSyncRunService.finishFailure(syncRunId, error.message || 'SAMA sync retry failed');
      next(error);
    }
  }

  private async runSync(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
    syncType: string,
    schema: any,
    message: string,
    runner: (context: any, payload: Record<string, unknown>) => Promise<Record<string, unknown>>
  ): Promise<void> {
    let context: any;
    let syncRunId: string | undefined;
    try {
      const payload = parseOrThrow(schema, req.body || {});
      context = await samaAccessService.getActorContext(req.user!, payload.societyId as string | undefined);
      const syncRun = await samaSyncRunService.start(context, syncType, payload);
      syncRunId = syncRun._id.toString();
      const result = await runner(context, payload);
      await samaSyncRunService.finishSuccess(syncRunId, result);
      await auditService.log({
        societyId: context.societyId,
        actorUserId: context.user.userId,
        actorRole: context.user.roleCode,
        moduleCode: 'SAMA',
        action: `SAMA_SYNC_${syncType}_COMPLETED`,
        entityType: 'SamaSyncRun',
        entityId: syncRunId,
        newValue: result,
        ipAddress: req.ip,
      });
      sendSuccess(res, result, message);
    } catch (error: any) {
      if (syncRunId) await samaSyncRunService.finishFailure(syncRunId, error.message || 'SAMA sync failed');
      if (context) {
        await auditService.log({
          societyId: context.societyId,
          actorUserId: context.user.userId,
          actorRole: context.user.roleCode,
          moduleCode: 'SAMA',
          action: `SAMA_SYNC_${syncType}_FAILED`,
          entityType: 'SamaSyncRun',
          entityId: syncRunId,
          newValue: { error: error.message || 'SAMA sync failed' },
          ipAddress: req.ip,
        });
      }
      next(error);
    }
  }

  private runSyncType(context: any, syncType: string, payload: Record<string, unknown>) {
    if (syncType === 'EMPLOYEES') return samaSyncService.syncEmployees(context);
    if (syncType === 'ATTENDANCE') return samaSyncService.syncAttendance(context, typeof payload.date === 'string' ? payload.date : undefined);
    if (syncType === 'LEAVES') return samaBridgeSyncService.syncLeaves(context);
    if (syncType === 'SHIFTS') return samaBridgeSyncService.syncShifts(context);
    if (syncType === 'PAYROLL') return samaBridgeSyncService.syncPayroll(context, typeof payload.monthKey === 'string' ? payload.monthKey : undefined);
    return samaAccessEventService.syncAccessEvents(context, typeof payload.limit === 'number' ? payload.limit : 100);
  }
}

export const samaSyncController = new SamaSyncController();
