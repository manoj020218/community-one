import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../../common/types';
import { reportService } from './report.service';
import { sendSuccess } from '../../common/utils/response';
import { isSuperRole } from '../../common/utils/authScope';

export class ReportController {
  async getDefinitions(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const definitions = await reportService.getAllDefinitions(isSuperRole(req.user!.roleCode));
      sendSuccess(res, definitions, 'Report definitions retrieved');
    } catch (error) { next(error); }
  }

  async runReport(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { code } = req.params;
      const societyId = req.query.societyId as string || req.user!.societyId || '';
      const data = await reportService.runReport(code, societyId, req.query as any, isSuperRole(req.user!.roleCode));
      sendSuccess(res, data, `Report ${code} executed`);
    } catch (error) { next(error); }
  }
}

export const reportController = new ReportController();
