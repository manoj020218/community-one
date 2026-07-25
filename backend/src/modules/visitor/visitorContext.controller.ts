import { NextFunction, Response } from 'express';
import { AuthorizationError } from '../../common/errors/AppError';
import { AuthenticatedRequest } from '../../common/types';
import { parsePagination, sendPaginated, sendSuccess } from '../../common/utils/response';
import { PERMISSIONS } from '../../config/constants';
import { visitorAccessService } from './visitor.access.service';
import { visitorContextService } from './visitor.context.service';
import { visitorDirectoryService } from './visitor.directory.service';
import { visitorQueryService } from './visitor.query.service';
import { visitorRealtimeService } from './visitor.realtime.service';
import { visitorSettingsService } from './visitor.settings.service';

export class VisitorContextController {
  async getContext(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const context = await visitorAccessService.getActorContext(req.user!, req.query.societyId as string);
      sendSuccess(res, await visitorContextService.getContext(context), 'Visitor context retrieved');
    } catch (error) { next(error); }
  }

  async openEvents(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const context = await visitorAccessService.getActorContext(req.user!, req.query.societyId as string);
      visitorRealtimeService.register(context, res);
    } catch (error) { next(error); }
  }

  async getTowers(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const context = await visitorAccessService.getActorContext(req.user!, req.query.societyId as string);
      sendSuccess(res, await visitorDirectoryService.getTowers(context), 'Visitor towers retrieved');
    } catch (error) { next(error); }
  }

  async getFlats(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const context = await visitorAccessService.getActorContext(req.user!, req.query.societyId as string);
      const { page, limit } = parsePagination(req.query);
      sendPaginated(res, await visitorDirectoryService.getFlats(context, req.params.towerId, page, limit, req.query.search as string), 'Visitor flats retrieved');
    } catch (error) { next(error); }
  }

  async getSettings(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const context = await visitorAccessService.getActorContext(req.user!, req.query.societyId as string);
      sendSuccess(res, await visitorSettingsService.getSettings(context.societyId), 'Visitor settings retrieved');
    } catch (error) { next(error); }
  }

  async updateSettings(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const context = await visitorAccessService.getActorContext(req.user!, req.body.societyId);
      sendSuccess(res, await visitorSettingsService.updateSettings(context, req.body), 'Visitor settings updated');
    } catch (error) { next(error); }
  }

  async getSummary(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const context = await visitorAccessService.getActorContext(req.user!, req.query.societyId as string);
      if (!req.user!.permissions.includes(PERMISSIONS.VISITOR_REPORT_VIEW)) throw new AuthorizationError('Visitor report access denied');
      sendSuccess(res, await visitorQueryService.getSummary(context), 'Visitor summary retrieved');
    } catch (error) { next(error); }
  }
}

export const visitorContextController = new VisitorContextController();
