import { NextFunction, Response } from 'express';
import { AuthenticatedRequest } from '../../common/types';
import { sendSuccess } from '../../common/utils/response';
import { auditService } from '../audit/audit.service';
import { McrActorContext, mcrAccessService } from './mcr.access.service';
import { mcrReminderService } from './mcrReminder.service';

function resolveContext(req: AuthenticatedRequest): Promise<McrActorContext> {
  const societyId = typeof req.body.societyId === 'string'
    ? req.body.societyId
    : typeof req.query.societyId === 'string'
      ? req.query.societyId
      : undefined;
  return mcrAccessService.getActorContext(req.user!, societyId);
}

export class McrReminderController {
  async sendForDemand(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const context = await resolveContext(req);
      const result = await mcrReminderService.sendDemandReminder(context.societyId, req.params.demandId, req.body);
      await auditService.log({
        societyId: context.societyId,
        actorUserId: context.user.userId,
        actorRole: context.user.roleCode,
        moduleCode: 'MCR',
        action: 'MCR_DEMAND_REMINDER_SENT',
        entityType: 'MaintenanceDemand',
        entityId: req.params.demandId,
        newValue: result,
        ipAddress: req.ip,
      });
      sendSuccess(res, result, 'MCR demand reminder processed');
    } catch (error) {
      next(error);
    }
  }

  async runOutstanding(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const context = await resolveContext(req);
      const result = await mcrReminderService.runOutstandingReminders(context.societyId, req.body);
      sendSuccess(res, result, 'MCR reminder batch processed');
    } catch (error) {
      next(error);
    }
  }
}

export const mcrReminderController = new McrReminderController();
