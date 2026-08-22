import { NextFunction, Response } from 'express';
import { ValidationError } from '../../common/errors/AppError';
import { AuthenticatedRequest } from '../../common/types';
import { sendSuccess } from '../../common/utils/response';
import { PERMISSIONS } from '../../config/constants';
import { McrActorContext, mcrAccessService } from './mcr.access.service';
import { McrReportQuery, mcrReportQuerySchema } from './mcrReport.schemas';
import { mcrReportService } from './mcrReport.service';
import { parseOrThrow } from './mcr.validation';

function resolveContext(req: AuthenticatedRequest): Promise<McrActorContext> {
  const societyId = typeof req.query.societyId === 'string' ? req.query.societyId : undefined;
  return mcrAccessService.getActorContext(req.user!, societyId);
}

function resolveFlatScope(req: AuthenticatedRequest, query: McrReportQuery) {
  const permissions = req.user!.permissions || [];
  if (permissions.includes(PERMISSIONS.MCR_VIEW_ALL) || permissions.includes(PERMISSIONS.MCR_VIEW_REPORTS)) return query.flatId;
  return req.user!.flatId || query.flatId;
}

export class McrReportController {
  async getSummary(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const context = await resolveContext(req);
      const query = parseOrThrow(mcrReportQuerySchema, req.query);
      const summary = await mcrReportService.getSummary(context.societyId, resolveFlatScope(req, query));
      sendSuccess(res, summary, 'MCR summary retrieved');
    } catch (error) {
      next(error);
    }
  }

  async getSummaryByTower(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const context = await resolveContext(req);
      const summary = await mcrReportService.getSummaryByTower(context.societyId);
      sendSuccess(res, summary, 'MCR tower-wise summary retrieved');
    } catch (error) {
      next(error);
    }
  }

  async getFundBalance(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const context = await resolveContext(req);
      const balance = await mcrReportService.getFundBalance(context.societyId);
      sendSuccess(res, balance, 'MCR fund balance retrieved');
    } catch (error) {
      next(error);
    }
  }

  async getIncomeExpenditureStatement(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const context = await resolveContext(req);
      const query = parseOrThrow(mcrReportQuerySchema, req.query);
      if (!query.startDate || !query.endDate) throw new ValidationError('startDate and endDate are required');
      const statement = await mcrReportService.getIncomeExpenditureStatement(context.societyId, query.startDate, query.endDate);
      sendSuccess(res, statement, 'MCR income & expenditure statement retrieved');
    } catch (error) {
      next(error);
    }
  }

  async getStatement(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const context = await resolveContext(req);
      const query = parseOrThrow(mcrReportQuerySchema, req.query);
      const flatId = resolveFlatScope(req, query);
      if (!flatId && !req.user!.flatId) throw new ValidationError('flatId is required for statement reports');
      const statement = await mcrReportService.getStatement(context.societyId, flatId || req.user!.flatId!);
      sendSuccess(res, statement, 'MCR statement retrieved');
    } catch (error) {
      next(error);
    }
  }

  async listCollections(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const context = await resolveContext(req);
      const query = parseOrThrow(mcrReportQuerySchema, req.query);
      const items = await mcrReportService.listCollections(context.societyId, { ...query, flatId: resolveFlatScope(req, query) });
      sendSuccess(res, items, 'MCR collections retrieved');
    } catch (error) {
      next(error);
    }
  }
}

export const mcrReportController = new McrReportController();
