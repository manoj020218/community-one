import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../../common/types';
import { notificationService } from './notification.service';
import { sendSuccess, sendPaginated, parsePagination } from '../../common/utils/response';

export class NotificationController {
  async getMyNotifications(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { page, limit } = parsePagination(req.query);
      const result = await notificationService.findByUser(req.user!.userId, page, limit, req.query.type as string);
      sendPaginated(res, result, 'Notifications retrieved');
    } catch (error) { next(error); }
  }

  async getUnreadCount(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const count = await notificationService.getUnreadCount(req.user!.userId);
      sendSuccess(res, { count }, 'Unread count retrieved');
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
