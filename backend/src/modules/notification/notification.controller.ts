import { NextFunction, Response } from 'express';
import { AuthenticatedRequest } from '../../common/types';
import { parsePagination, sendPaginated, sendSuccess } from '../../common/utils/response';
import { notificationDeviceTokenService } from './notificationDeviceToken.service';
import { notificationService } from './notification.service';

export class NotificationController {
  async registerDeviceToken(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const token = await notificationDeviceTokenService.register({
        userId: req.user!.userId,
        societyId: req.user!.societyId,
        token: req.body.token,
        platform: req.body.platform,
      });
      sendSuccess(res, token, 'Notification device token registered');
    } catch (error) { next(error); }
  }

  async unregisterDeviceToken(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      await notificationDeviceTokenService.unregister(req.user!.userId, req.body.token);
      sendSuccess(res, null, 'Notification device token unregistered');
    } catch (error) { next(error); }
  }

  async getMyNotifications(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { page, limit } = parsePagination(req.query);
      const result = await notificationService.findByUser(req.user!.userId, page, limit, req.query.type as string);
      sendPaginated(res, result, 'Notifications retrieved');
    } catch (error) { next(error); }
  }

  async getUnreadCount(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      sendSuccess(res, { count: await notificationService.getUnreadCount(req.user!.userId) }, 'Unread count retrieved');
    } catch (error) { next(error); }
  }

  async markRead(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      await notificationService.markRead(req.params.id, req.user!.userId);
      sendSuccess(res, null, 'Notification marked as read');
    } catch (error) { next(error); }
  }

  async markAllRead(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      await notificationService.markAllRead(req.user!.userId);
      sendSuccess(res, null, 'All notifications marked as read');
    } catch (error) { next(error); }
  }
}

export const notificationController = new NotificationController();
