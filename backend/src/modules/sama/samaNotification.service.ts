import { notificationService } from '../notification/notification.service';
import { Resident } from '../resident/resident.model';
import { User } from '../user/user.model';

interface SamaNotificationInput {
  title: string;
  message: string;
  actionUrl?: string;
  entityType?: string;
  entityId?: string;
  type?: string;
  priority?: string;
  metadata?: Record<string, unknown>;
}

export class SamaNotificationService {
  async notifyUser(societyId: string, userId: string | undefined, input: SamaNotificationInput): Promise<void> {
    await this.notifyUsers(societyId, userId ? [userId] : [], input);
  }

  async notifyResidentsByFlat(societyId: string, flatId: string | undefined, input: SamaNotificationInput): Promise<void> {
    if (!flatId) return;
    const residents = await Resident.find({
      societyId,
      flatId,
      status: 'ACTIVE',
      isActive: true,
      loginAllowed: true,
      userId: { $exists: true, $ne: null },
    }).select('userId');
    const userIds = residents.map((item) => item.userId?.toString()).filter(Boolean) as string[];
    await this.notifyUsers(societyId, userIds, input);
  }

  async notifySocietyRoles(societyId: string, roleCodes: string[], input: SamaNotificationInput): Promise<void> {
    const users = await User.find({ societyId, roleCode: { $in: roleCodes }, isActive: true }).select('_id');
    await this.notifyUsers(societyId, users.map((item) => item._id.toString()), input);
  }

  async notifyUsers(societyId: string, userIds: string[], input: SamaNotificationInput): Promise<void> {
    const distinctUserIds = [...new Set(userIds.filter(Boolean))];
    if (!distinctUserIds.length) return;
    await notificationService.createBulk(distinctUserIds.map((userId) => ({
      societyId,
      userId,
      title: input.title,
      message: input.message,
      type: (input.type || 'INFO') as any,
      moduleCode: 'SAMA',
      actionUrl: input.actionUrl,
      entityType: input.entityType,
      entityId: input.entityId,
      priority: (input.priority || 'MEDIUM') as any,
      metadata: input.metadata,
    })));
  }
}

export const samaNotificationService = new SamaNotificationService();
