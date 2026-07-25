import { NotificationDeviceToken, INotificationDeviceTokenDocument } from './notificationDeviceToken.model';

export interface RegisterNotificationTokenDto {
  userId: string;
  societyId?: string;
  token: string;
  platform?: 'ANDROID' | 'IOS' | 'WEB';
}

export class NotificationDeviceTokenService {
  async register(dto: RegisterNotificationTokenDto): Promise<INotificationDeviceTokenDocument> {
    return NotificationDeviceToken.findOneAndUpdate(
      { token: dto.token },
      {
        userId: dto.userId,
        societyId: dto.societyId,
        token: dto.token,
        platform: dto.platform,
        provider: 'FCM',
        isActive: true,
        invalidatedAt: null,
        invalidationReason: null,
        lastSeenAt: new Date(),
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  }

  async unregister(userId: string, token: string): Promise<void> {
    await NotificationDeviceToken.findOneAndUpdate({ userId, token }, { isActive: false, invalidatedAt: new Date() });
  }

  async getActiveTokensForUsers(userIds: string[]): Promise<INotificationDeviceTokenDocument[]> {
    return NotificationDeviceToken.find({ userId: { $in: userIds }, isActive: true });
  }

  async invalidateToken(token: string, reason: string): Promise<void> {
    await NotificationDeviceToken.findOneAndUpdate(
      { token },
      { isActive: false, invalidatedAt: new Date(), invalidationReason: reason }
    );
  }
}

export const notificationDeviceTokenService = new NotificationDeviceTokenService();
