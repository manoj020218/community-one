import { PaginatedResult } from '../../common/types';
import { buildPaginatedResult } from '../../common/utils/response';
import { Notification, INotificationDocument } from './notification.model';

export interface CreateNotificationDto {
  societyId?: string;
  userId: string;
  title: string;
  message: string;
  type?: string;
  moduleCode?: string;
  actionUrl?: string;
  priority?: string;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
  deliveryStatus?: string;
  deliveryAttempts?: number;
  lastDeliveryAttemptAt?: Date;
  lastDeliveryError?: string;
  providerMessageId?: string;
}

export class NotificationService {
  async create(dto: CreateNotificationDto): Promise<INotificationDocument> {
    return Notification.create({ ...dto, deliveryStatus: dto.deliveryStatus || 'PENDING' });
  }

  async createBulk(dtos: CreateNotificationDto[]): Promise<INotificationDocument[]> {
    return Notification.insertMany(dtos.map((dto) => ({ ...dto, deliveryStatus: dto.deliveryStatus || 'PENDING' }))) as unknown as INotificationDocument[];
  }

  async findByUser(userId: string, page: number, limit: number, type?: string): Promise<PaginatedResult<INotificationDocument>> {
    const query: Record<string, unknown> = { userId };
    if (type) query.type = type;
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      Notification.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Notification.countDocuments(query),
    ]);
    return buildPaginatedResult(items, total, page, limit);
  }

  async markRead(notificationId: string, userId: string): Promise<void> {
    await Notification.findOneAndUpdate({ _id: notificationId, userId }, { readAt: new Date(), deliveryStatus: 'READ' });
  }

  async markAllRead(userId: string): Promise<void> {
    await Notification.updateMany({ userId, readAt: null }, { readAt: new Date(), deliveryStatus: 'READ' });
  }

  async getUnreadCount(userId: string): Promise<number> {
    return Notification.countDocuments({ userId, readAt: null });
  }

  async markDeliveryStatus(
    notificationId: string,
    update: Pick<CreateNotificationDto, 'deliveryStatus' | 'deliveryAttempts' | 'lastDeliveryAttemptAt' | 'lastDeliveryError' | 'providerMessageId'>
  ): Promise<void> {
    await Notification.findByIdAndUpdate(notificationId, update);
  }
}

export const notificationService = new NotificationService();
