import { Notification, INotificationDocument } from './notification.model';
import { buildPaginatedResult } from '../../common/utils/response';
import { PaginatedResult } from '../../common/types';
import { logger } from '../../common/utils/logger';

export interface CreateNotificationDto {
  societyId?: string;
  userId: string;
  title: string;
  message: string;
  type?: string;
  moduleCode?: string;
  actionUrl?: string;
  priority?: string;
}

export class NotificationService {
  async create(dto: CreateNotificationDto): Promise<INotificationDocument> {
    return Notification.create({ ...dto, deliveryStatus: 'SENT' });
  }

  async createBulk(dtos: CreateNotificationDto[]): Promise<void> {
    await Notification.insertMany(dtos.map((d) => ({ ...d, deliveryStatus: 'SENT' })));
  }

  async findByUser(userId: string, page: number, limit: number, type?: string): Promise<PaginatedResult<INotificationDocument>> {
    const query: any = { userId };
    if (type) query.type = type;
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      Notification.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Notification.countDocuments(query),
    ]);
    return buildPaginatedResult(items, total, page, limit);
  }

  async markRead(notificationId: string, userId: string): Promise<void> {
    await Notification.findOneAndUpdate(
      { _id: notificationId, userId },
      { readAt: new Date(), deliveryStatus: 'READ' }
    );
  }

  async markAllRead(userId: string): Promise<void> {
    await Notification.updateMany(
      { userId, readAt: null },
      { readAt: new Date(), deliveryStatus: 'READ' }
    );
  }

  async getUnreadCount(userId: string): Promise<number> {
    return Notification.countDocuments({ userId, readAt: null });
  }

  async sendPushPlaceholder(dto: CreateNotificationDto): Promise<void> {
    // FCM integration placeholder — structure ready for real push notifications
    logger.info(`[FCM-PLACEHOLDER] Push notification to user ${dto.userId}: ${dto.title}`);
  }
}

export const notificationService = new NotificationService();
