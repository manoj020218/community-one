import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../../common/types';
import { sendSuccess } from '../../common/utils/response';
import { guardPatrolAccessService } from './guardPatrol.access.service';
import { patrolReportService } from './patrolReport.service';
import { patrolRoundService } from './patrolRound.service';

export class PatrolReportController {
  async summary(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const context = await guardPatrolAccessService.getActorContext(req.user!, req.query.societyId as string);
      const now = new Date();
      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : new Date(now.getFullYear(), now.getMonth(), 1);
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : now;
      sendSuccess(res, await patrolReportService.getHitMissSummary(context.societyId, startDate, endDate), 'Hit/Miss summary retrieved');
    } catch (error) { next(error); }
  }

  async liveRounds(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const context = await guardPatrolAccessService.getActorContext(req.user!, req.query.societyId as string);
      sendSuccess(res, await patrolRoundService.findLiveRounds(context.societyId), 'Live rounds retrieved');
    } catch (error) { next(error); }
  }

  async exportMonthly(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const context = await guardPatrolAccessService.getActorContext(req.user!, req.query.societyId as string);
      const year = parseInt(req.query.year as string) || new Date().getFullYear();
      const month = parseInt(req.query.month as string) || new Date().getMonth() + 1;
      sendSuccess(res, await patrolReportService.exportMonthlyReport(context.societyId, year, month), 'Report generated');
    } catch (error) { next(error); }
  }
}

export const patrolReportController = new PatrolReportController();
