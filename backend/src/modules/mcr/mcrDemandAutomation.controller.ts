import { NextFunction, Response } from 'express';
import { AuthenticatedRequest } from '../../common/types';
import { sendSuccess } from '../../common/utils/response';
import { auditService } from '../audit/audit.service';
import { McrActorContext, mcrAccessService } from './mcr.access.service';
import { mcrDemandAutomationService } from './mcrDemandAutomation.service';

function resolveContext(req: AuthenticatedRequest): Promise<McrActorContext> {
  const societyId = typeof req.body.societyId === 'string'
    ? req.body.societyId
    : typeof req.query.societyId === 'string'
      ? req.query.societyId
      : undefined;
  return mcrAccessService.getActorContext(req.user!, societyId);
}

export class McrDemandAutomationController {
  async run(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const context = await resolveContext(req);
      const result = await mcrDemandAutomationService.runForSociety(context.societyId, req.body, context.user.userId);
      await auditService.log({
        societyId: context.societyId,
        actorUserId: context.user.userId,
        actorRole: context.user.roleCode,
        moduleCode: 'MCR',
        action: 'MCR_DEMAND_AUTOMATION_RUN',
        entityType: 'BillingPlan',
        newValue: result,
        ipAddress: req.ip,
      });
      sendSuccess(res, result, 'MCR demand automation completed');
    } catch (error) {
      next(error);
    }
  }
}

export const mcrDemandAutomationController = new McrDemandAutomationController();
