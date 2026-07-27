import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../../common/types';
import { sendSuccess } from '../../common/utils/response';
import { auditService } from '../audit/audit.service';
import { mcrAccessService } from './mcr.access.service';
import { mcrSettingsService } from './mcrSettings.service';

export class McrSettingsController {
  async get(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const societyId = typeof req.query.societyId === 'string' ? req.query.societyId : undefined;
      const context = await mcrAccessService.getActorContext(req.user!, societyId);
      const settings = await mcrSettingsService.getBySociety(context.societyId, context.user.userId);
      sendSuccess(res, settings, 'MCR settings retrieved');
    } catch (error) {
      next(error);
    }
  }

  async update(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const societyId = typeof req.body.societyId === 'string' ? req.body.societyId : undefined;
      const context = await mcrAccessService.getActorContext(req.user!, societyId);
      const settings = await mcrSettingsService.update(context, req.body);
      await auditService.log({
        societyId: context.societyId,
        actorUserId: context.user.userId,
        actorRole: context.user.roleCode,
        moduleCode: 'MCR',
        action: 'MCR_SETTINGS_UPDATED',
        entityType: 'McrSettings',
        entityId: settings._id!.toString(),
        newValue: req.body,
        ipAddress: req.ip,
      });
      sendSuccess(res, settings, 'MCR settings updated');
    } catch (error) {
      next(error);
    }
  }
}

export const mcrSettingsController = new McrSettingsController();
