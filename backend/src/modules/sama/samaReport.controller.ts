import { NextFunction, Response } from 'express';
import { AuthenticatedRequest } from '../../common/types';
import { sendSuccess } from '../../common/utils/response';
import { samaAccessService } from './sama.access.service';
import {
  samaAccessExceptionReportQuerySchema,
  samaDashboardQuerySchema,
  samaExportQuerySchema,
  samaPaymentReportQuerySchema,
  samaWorkOrderReportQuerySchema,
} from './samaReport.schemas';
import { samaReportService } from './samaReport.service';
import { parseOrThrow } from './sama.validation';

export class SamaReportController {
  async getDashboard(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    await this.withContext(req, res, next, samaDashboardQuerySchema, 'SAMA dashboard retrieved', (societyId) => samaReportService.getDashboard(societyId));
  }

  async getStaffReport(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    await this.withContext(req, res, next, samaDashboardQuerySchema, 'SAMA staff report retrieved', (societyId) => samaReportService.getStaffReport(societyId));
  }

  async getProviderReport(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    await this.withContext(req, res, next, samaDashboardQuerySchema, 'SAMA provider report retrieved', (societyId) => samaReportService.getProviderReport(societyId));
  }

  async getHouseholdPaymentReport(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    await this.withContext(req, res, next, samaPaymentReportQuerySchema, 'SAMA household payment report retrieved', (societyId, query) => samaReportService.getHouseholdPaymentReport(societyId, query));
  }

  async getWorkOrderReport(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    await this.withContext(req, res, next, samaWorkOrderReportQuerySchema, 'SAMA work-order report retrieved', (societyId, query) => samaReportService.getWorkOrderReport(societyId, query));
  }

  async getSyncHealthReport(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    await this.withContext(req, res, next, samaDashboardQuerySchema, 'SAMA sync health report retrieved', (societyId) => samaReportService.getSyncHealthReport(societyId));
  }

  async getAccessExceptionReport(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    await this.withContext(req, res, next, samaAccessExceptionReportQuerySchema, 'SAMA access exception report retrieved', (societyId, query) => samaReportService.getAccessExceptionReport(societyId, query));
  }

  async export(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    await this.withContext(req, res, next, samaExportQuerySchema, 'SAMA report export generated', (societyId, query) => samaReportService.exportReport(societyId, query.reportType, query));
  }

  private async withContext(req: AuthenticatedRequest, res: Response, next: NextFunction, schema: any, message: string, loader: (societyId: string, query: any) => Promise<any>) {
    try {
      const query = parseOrThrow(schema, req.query);
      const context = await samaAccessService.getActorContext(req.user!, query.societyId as string | undefined);
      sendSuccess(res, await loader(context.societyId, query), message);
    } catch (error) {
      next(error);
    }
  }
}

export const samaReportController = new SamaReportController();
