import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../../common/types';
import { sendSuccess } from '../../common/utils/response';
import { guardPatrolAccessService } from './guardPatrol.access.service';
import { patrolSettingsService } from './patrolSettings.service';

export class PatrolSettingsController {
  async get(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const context = await guardPatrolAccessService.getActorContext(req.user!, req.query.societyId as string);
      sendSuccess(res, await patrolSettingsService.getSettings(context.societyId));
    } catch (error) { next(error); }
  }

  async update(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const context = await guardPatrolAccessService.getActorContext(req.user!, req.query.societyId as string || req.body.societyId);
      sendSuccess(res, await patrolSettingsService.updateSettings(context.societyId, req.body), 'Settings updated');
    } catch (error) { next(error); }
  }
}

export const patrolSettingsController = new PatrolSettingsController();
