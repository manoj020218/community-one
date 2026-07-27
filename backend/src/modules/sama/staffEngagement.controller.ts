import { NextFunction, Response } from 'express';
import { AuthenticatedRequest } from '../../common/types';
import { sendCreated, sendPaginated } from '../../common/utils/response';
import { auditService } from '../audit/audit.service';
import { samaAccessService } from './sama.access.service';
import { staffEngagementService } from './staffEngagement.service';

export class StaffEngagementController {
  async list(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const context = await samaAccessService.getActorContext(req.user!, typeof req.query.societyId === 'string' ? req.query.societyId : undefined);
      sendPaginated(res, await staffEngagementService.listBySociety(context.societyId, req.query), 'SAMA staff engagements retrieved');
    } catch (error) {
      next(error);
    }
  }

  async create(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const context = await samaAccessService.getActorContext(req.user!, typeof req.body.societyId === 'string' ? req.body.societyId : undefined);
      const engagement = await staffEngagementService.create(context, req.body);
      await auditService.log({ societyId: context.societyId, actorUserId: context.user.userId, actorRole: context.user.roleCode, moduleCode: 'SAMA', action: 'SAMA_STAFF_ENGAGEMENT_CREATED', entityType: 'StaffEngagement', entityId: engagement._id!.toString(), newValue: { staffProfileId: engagement.staffProfileId, engagementType: engagement.engagementType }, ipAddress: req.ip });
      sendCreated(res, engagement, 'SAMA staff engagement created');
    } catch (error) {
      next(error);
    }
  }
}

export const staffEngagementController = new StaffEngagementController();
