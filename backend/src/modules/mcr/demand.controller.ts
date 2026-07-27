import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../../common/types';
import { sendCreated, sendSuccess } from '../../common/utils/response';
import { auditService } from '../audit/audit.service';
import { McrActorContext, mcrAccessService } from './mcr.access.service';
import { demandDraftService } from './demandDraft.service';
import { demandPublishService } from './demandPublish.service';

function resolveContext(req: AuthenticatedRequest): Promise<McrActorContext> {
  const societyId = typeof req.body.societyId === 'string'
    ? req.body.societyId
    : typeof req.query.societyId === 'string'
      ? req.query.societyId
      : undefined;
  return mcrAccessService.getActorContext(req.user!, societyId);
}

export class DemandController {
  async list(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const context = await resolveContext(req);
      const items = await demandDraftService.listBySociety(context.societyId, req.query.status as string | undefined);
      sendSuccess(res, items, 'MCR demands retrieved');
    } catch (error) {
      next(error);
    }
  }

  async createDrafts(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const context = await resolveContext(req);
      const result = await demandDraftService.createDrafts(context, req.body);
      await auditService.log({
        societyId: context.societyId,
        actorUserId: context.user.userId,
        actorRole: context.user.roleCode,
        moduleCode: 'MCR',
        action: 'MCR_DEMAND_DRAFTS_GENERATED',
        entityType: 'MaintenanceDemand',
        newValue: { billingPlanId: req.body.billingPlanId, billingPeriodKey: req.body.billingPeriodKey, createdCount: result.createdCount },
        ipAddress: req.ip,
      });
      sendCreated(res, result, 'MCR demand drafts generated');
    } catch (error) {
      next(error);
    }
  }

  async publish(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const context = await resolveContext(req);
      const demand = await demandPublishService.publish(context, req.params.demandId);
      await auditService.log({
        societyId: context.societyId,
        actorUserId: context.user.userId,
        actorRole: context.user.roleCode,
        moduleCode: 'MCR',
        action: 'MCR_DEMAND_PUBLISHED',
        entityType: 'MaintenanceDemand',
        entityId: demand._id!.toString(),
        newValue: { demandNumber: demand.demandNumber, totalDemandPaise: demand.totalDemandPaise },
        ipAddress: req.ip,
      });
      sendSuccess(res, demand, 'MCR demand published');
    } catch (error) {
      next(error);
    }
  }
}

export const demandController = new DemandController();
