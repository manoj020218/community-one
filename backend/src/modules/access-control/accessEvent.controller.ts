import { NextFunction, Response } from 'express';
import { AuthenticatedRequest } from '../../common/types';
import { assertSocietyAccess } from '../../common/utils/authScope';
import { sendSuccess } from '../../common/utils/response';
import { accessEventService } from './accessEvent.service';
import { parseAccessInput, resolveEventSchema } from './access-control.validator';

export class AccessEventController {
  async listBySociety(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      assertSocietyAccess(req.user!, req.params.societyId);
      const matchStatus = typeof req.query.matchStatus === 'string' ? req.query.matchStatus : undefined;
      const events = await accessEventService.listBySociety(req.params.societyId, matchStatus);
      sendSuccess(res, events, 'Access events retrieved');
    } catch (error) {
      next(error);
    }
  }

  async sync(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      assertSocietyAccess(req.user!, req.params.societyId);
      const result = await accessEventService.sync(req.params.societyId);
      sendSuccess(res, result, 'Access events synced');
    } catch (error) {
      next(error);
    }
  }

  async resolve(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const existing = await accessEventService.findById(req.params.id);
      assertSocietyAccess(req.user!, existing.societyId.toString());
      const dto = parseAccessInput(resolveEventSchema, req.body);
      const event = await accessEventService.resolve(req.params.id, dto.residentId);
      sendSuccess(res, event, 'Access event resolved');
    } catch (error) {
      next(error);
    }
  }
}

export const accessEventController = new AccessEventController();
