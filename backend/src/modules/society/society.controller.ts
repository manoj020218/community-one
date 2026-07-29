import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../../common/types';
import { AuthorizationError } from '../../common/errors/AppError';
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
      const isPlatformUser = ['JENIX_SUPER_ADMIN', 'JENIX_SUPPORT'].includes(req.user!.roleCode);
      const scopedSocietyId = isPlatformUser ? undefined : req.user!.societyId;
      const result = await societyService.findAll(page, limit, req.query.search as string, scopedSocietyId);
      sendPaginated(res, result, 'Societies retrieved');
    } catch (error) {
      next(error);
    }
  }

  async findById(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const society = await societyService.findById(req.params.id);
      if (!['JENIX_SUPER_ADMIN', 'JENIX_SUPPORT'].includes(req.user!.roleCode) && req.user!.societyId !== society._id!.toString()) {
        throw new AuthorizationError('Access denied to this society');
      }
      sendSuccess(res, society);
    } catch (error) {
      next(error);
    }
  }

  async update(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const current = await societyService.findById(req.params.id);
      if (!['JENIX_SUPER_ADMIN', 'JENIX_SUPPORT'].includes(req.user!.roleCode) && req.user!.societyId !== current._id!.toString()) {
        throw new AuthorizationError('Access denied to this society');
      }
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
      const isPlatformUser = ['JENIX_SUPER_ADMIN', 'JENIX_SUPPORT'].includes(req.user!.roleCode);
      const stats = await societyService.getStats(isPlatformUser ? undefined : req.user!.societyId);
      sendSuccess(res, stats, 'Stats retrieved');
    } catch (error) {
      next(error);
    }
  }
}

export const societyController = new SocietyController();
