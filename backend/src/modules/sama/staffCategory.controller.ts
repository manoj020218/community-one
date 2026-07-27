import { NextFunction, Response } from 'express';
import { AuthenticatedRequest } from '../../common/types';
import { sendCreated, sendPaginated, sendSuccess } from '../../common/utils/response';
import { auditService } from '../audit/audit.service';
import { samaAccessService } from './sama.access.service';
import { staffCategoryService } from './staffCategory.service';

export class StaffCategoryController {
  async list(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const context = await samaAccessService.getActorContext(req.user!, typeof req.query.societyId === 'string' ? req.query.societyId : undefined);
      sendPaginated(res, await staffCategoryService.listBySociety(context.societyId, req.query), 'SAMA staff categories retrieved');
    } catch (error) {
      next(error);
    }
  }

  async create(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const context = await samaAccessService.getActorContext(req.user!, typeof req.body.societyId === 'string' ? req.body.societyId : undefined);
      const category = await staffCategoryService.create(context, req.body);
      await auditService.log({ societyId: context.societyId, actorUserId: context.user.userId, actorRole: context.user.roleCode, moduleCode: 'SAMA', action: 'SAMA_STAFF_CATEGORY_CREATED', entityType: 'StaffCategory', entityId: category._id!.toString(), newValue: { code: category.code, name: category.name }, ipAddress: req.ip });
      sendCreated(res, category, 'SAMA staff category created');
    } catch (error) {
      next(error);
    }
  }

  async update(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const context = await samaAccessService.getActorContext(req.user!, typeof req.body.societyId === 'string' ? req.body.societyId : undefined);
      sendSuccess(res, await staffCategoryService.update(context, req.params.categoryId, req.body), 'SAMA staff category updated');
    } catch (error) {
      next(error);
    }
  }
}

export const staffCategoryController = new StaffCategoryController();
