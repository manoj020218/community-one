import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../../common/types';
import { auditService } from './audit.service';
import { sendPaginated } from '../../common/utils/response';
import { parsePagination } from '../../common/utils/response';

export class AuditController {
  async getBySociety(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { societyId } = req.params;
      const { page, limit } = parsePagination(req.query);
      const filter = {
        actorUserId: req.query.actorUserId as string,
        moduleCode: req.query.moduleCode as string,
        action: req.query.action as string,
        entityType: req.query.entityType as string,
        startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
        endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
      };
      const result = await auditService.findBySociety(societyId, filter, page, limit);
      sendPaginated(res, result, 'Audit logs retrieved');
    } catch (error) {
      next(error);
    }
  }

  async getAll(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { page, limit } = parsePagination(req.query);
      const result = await auditService.findAll(req.query as any, page, limit);
      sendPaginated(res, result, 'Audit logs retrieved');
    } catch (error) {
      next(error);
    }
  }
}

export const auditController = new AuditController();
