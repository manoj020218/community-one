import { NextFunction, Response } from 'express';
import { AuthenticatedRequest } from '../../common/types';
import { sendPaginated, sendSuccess } from '../../common/utils/response';
import { samaAccessService } from './sama.access.service';
import { samaSourceService } from './samaSource.service';
import {
  samaAccessEventListQuerySchema,
  samaAttendanceListQuerySchema,
  samaLeaveListQuerySchema,
  samaPayrollRunListQuerySchema,
  samaStaffListQuerySchema,
  samaSyncRunListQuerySchema,
} from './samaRead.schemas';
import { samaQueryService } from './samaQuery.service';
import { parseOrThrow } from './sama.validation';

export class SamaReadController {
  async listStaff(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    await this.sendList(req, res, next, samaStaffListQuerySchema, 'SAMA staff retrieved', (societyId, query) => samaQueryService.listStaff(societyId, query));
  }

  async getStaff(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    await this.sendSingle(req, res, next, 'SAMA staff retrieved', (societyId) => samaQueryService.findStaffById(societyId, req.params.staffId));
  }

  async listAttendanceEvents(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    await this.sendList(req, res, next, samaAttendanceListQuerySchema, 'SAMA attendance events retrieved', (societyId, query) => samaQueryService.listAttendanceEvents(societyId, query));
  }

  async listShifts(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    await this.sendList(req, res, next, samaStaffListQuerySchema.pick({ societyId: true, page: true, limit: true }), 'SAMA shifts retrieved', (societyId, query) => samaQueryService.listShifts(societyId, query));
  }

  async listLeaves(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    await this.sendList(req, res, next, samaLeaveListQuerySchema, 'SAMA leaves retrieved', (societyId, query) => samaQueryService.listLeaves(societyId, query));
  }

  async listPayrollRuns(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    await this.sendList(req, res, next, samaPayrollRunListQuerySchema, 'SAMA payroll runs retrieved', (societyId, query) => samaQueryService.listPayrollRuns(societyId, query));
  }

  async getPayrollRun(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    await this.sendSingle(req, res, next, 'SAMA payroll run retrieved', (societyId) => samaQueryService.findPayrollRunById(societyId, req.params.runId));
  }

  async listSyncRuns(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    await this.sendList(req, res, next, samaSyncRunListQuerySchema, 'SAMA sync runs retrieved', (societyId, query) => samaQueryService.listSyncRuns(societyId, query));
  }

  async listAccessEvents(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    await this.sendList(req, res, next, samaAccessEventListQuerySchema, 'SAMA access events retrieved', (societyId, query) => samaQueryService.listAccessEvents(societyId, query));
  }

  async getSyncHealth(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const societyId = typeof req.query.societyId === 'string' ? req.query.societyId : undefined;
      const context = await samaAccessService.getActorContext(req.user!, societyId);
      sendSuccess(res, await samaSourceService.getHealthBySociety(context.societyId), 'SAMA sync health retrieved');
    } catch (error) {
      next(error);
    }
  }

  private async sendList(req: AuthenticatedRequest, res: Response, next: NextFunction, schema: any, message: string, loader: (societyId: string, query: Record<string, unknown>) => Promise<any>) {
    try {
      const query = parseOrThrow(schema, req.query);
      const context = await samaAccessService.getActorContext(req.user!, query.societyId as string | undefined);
      sendPaginated(res, await loader(context.societyId, query), message);
    } catch (error) {
      next(error);
    }
  }

  private async sendSingle(req: AuthenticatedRequest, res: Response, next: NextFunction, message: string, loader: (societyId: string) => Promise<any>) {
    try {
      const societyId = typeof req.query.societyId === 'string' ? req.query.societyId : undefined;
      const context = await samaAccessService.getActorContext(req.user!, societyId);
      sendSuccess(res, await loader(context.societyId), message);
    } catch (error) {
      next(error);
    }
  }
}

export const samaReadController = new SamaReadController();
