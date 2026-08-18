import { NextFunction, Response } from 'express';
import { AuthenticatedRequest } from '../../common/types';
import { sendCreated, sendSuccess } from '../../common/utils/response';
import { resolveActorSocietyId } from '../../common/utils/authScope';
import { auditService } from '../audit/audit.service';
import { parentWardLinkService } from './parentWardLink.service';

export class ParentWardLinkController {
  async create(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const societyId = resolveActorSocietyId(req.user!, req.body.societyId);
      const link = await parentWardLinkService.create({ ...req.body, societyId }, req.user!.userId);
      await auditService.log({ societyId, actorUserId: req.user!.userId, actorRole: req.user!.roleCode, moduleCode: 'CORE', action: 'PARENT_WARD_LINK_CREATED', entityType: 'ParentWardLink', entityId: link._id!.toString(), newValue: { userId: link.userId, residentIds: link.residentIds }, ipAddress: req.ip });
      sendCreated(res, link, 'Parent-ward link created');
    } catch (error) { next(error); }
  }

  async findBySociety(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const societyId = resolveActorSocietyId(req.user!, req.params.societyId, req.query.societyId as string);
      sendSuccess(res, await parentWardLinkService.findBySociety(societyId), 'Parent-ward links retrieved');
    } catch (error) { next(error); }
  }

  async myWards(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const societyId = resolveActorSocietyId(req.user!, req.query.societyId as string);
      sendSuccess(res, await parentWardLinkService.myWards(societyId, req.user!.userId), 'Wards retrieved');
    } catch (error) { next(error); }
  }

  async update(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      sendSuccess(res, await parentWardLinkService.update(req.params.id, req.body), 'Parent-ward link updated');
    } catch (error) { next(error); }
  }

  async disable(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      await parentWardLinkService.disable(req.params.id);
      sendSuccess(res, null, 'Parent-ward link disabled');
    } catch (error) { next(error); }
  }
}

export const parentWardLinkController = new ParentWardLinkController();
