import { NextFunction, Response } from 'express';
import { AuthenticatedRequest } from '../../common/types';
import { sendSuccess } from '../../common/utils/response';
import { samaAccessService } from './sama.access.service';
import { samaAccessEventService } from './samaAccessEvent.service';

export class SamaAccessEventController {
  async resolve(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const context = await samaAccessService.getActorContext(req.user!, typeof req.body.societyId === 'string' ? req.body.societyId : undefined);
      sendSuccess(res, await samaAccessEventService.resolve(context, req.params.eventId, req.body), 'SAMA access event updated');
    } catch (error) {
      next(error);
    }
  }
}

export const samaAccessEventController = new SamaAccessEventController();
