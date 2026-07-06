import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../../common/types';
import { societyService } from './society.service';
import { sendSuccess, sendCreated, sendPaginated, parsePagination } from '../../common/utils/response';
import { auditService } from '../audit/audit.service';

export class SocietyController {
  async create(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const society = await societyService.create(req.body, req.user!.userId);
      await auditService.log({
        actorUserId: req.user!.userId,
        actorRole: req.user!.roleCode,
        moduleCode: 'CORE',
        action: 'CREATE',
        entityType: 'Society',
        entityId: society._id!.toString(),
        newValue: { name: society.name, code: society.code },
        ipAddress: req.ip,
      });
      sendCreated(res, society, 'Society created successfully');
    } catch (error) {
      next(error);
    }
  }

  async findAll(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { page, limit } = parsePagination(req.query);
      const result = await societyService.findAll(page, limit, req.query.search as string);
      sendPaginated(res, result, 'Societies retrieved');
    } catch (error) {
      next(error);
    }
  }

  async findById(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const society = await societyService.findById(req.params.id);
      sendSuccess(res, society);
    } catch (error) {
      next(error);
    }
  }

  async update(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const society = await societyService.update(req.params.id, req.body);
      await auditService.log({
        societyId: req.params.id,
        actorUserId: req.user!.userId,
        actorRole: req.user!.roleCode,
        moduleCode: 'CORE',
        action: 'UPDATE',
        entityType: 'Society',
        entityId: req.params.id,
        newValue: req.body,
        ipAddress: req.ip,
      });
      sendSuccess(res, society, 'Society updated');
    } catch (error) {
      next(error);
    }
  }

  async getStats(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const stats = await societyService.getStats();
      sendSuccess(res, stats, 'Stats retrieved');
    } catch (error) {
      next(error);
    }
  }
}

export const societyController = new SocietyController();
