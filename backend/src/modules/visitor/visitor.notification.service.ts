import { logger } from '../../common/utils/logger';
import { auditService } from '../audit/audit.service';
import { notificationDeviceTokenService } from '../notification/notificationDeviceToken.service';
import { pushProviderService } from '../notification/pushProvider.service';
import { notificationService } from '../notification/notification.service';

export interface VisitorNotificationDispatchInput {
  societyId: string;
  userIds: string[];
  title: string;
  message: string;
  /** Body sent to the push/FCM notification tray — must never contain visitor PII. Falls back to `message` if omitted. */
  pushBody?: string;
  entityId: string;
  actionUrl?: string;
  metadata?: Record<string, unknown>;
  pushData?: Record<string, string>;
  actorUserId: string;
  actorRole: string;
}

export class VisitorNotificationService {
  async dispatch(input: VisitorNotificationDispatchInput): Promise<void> {
    if (!input.userIds.length) return;
    const provider = pushProviderService.getProvider();
    const health = provider.getHealth();

    await auditService.log({
      societyId: input.societyId,
      actorUserId: input.actorUserId,
      actorRole: input.actorRole,
      moduleCode: 'VISITOR',
      action: 'VISITOR_NOTIFICATION_REQUESTED',
      entityType: 'VisitorRequest',
      entityId: input.entityId,
      newValue: { userCount: input.userIds.length, providerStatus: health.status },
      ipAddress: '',
    });

    const notifications = await notificationService.createBulk(
      input.userIds.map((userId) => ({
        societyId: input.societyId,
        userId,
        title: input.title,
        message: input.message,
        type: 'APPROVAL',
        moduleCode: 'VISITOR',
        actionUrl: input.actionUrl,
        entityType: 'VisitorRequest',
        entityId: input.entityId,
        metadata: input.metadata,
        deliveryStatus: health.status === 'configured' ? 'PENDING' : 'PENDING_PROVIDER_CONFIGURATION',
      }))
    );

    if (health.status !== 'configured') return;
    const tokens = await notificationDeviceTokenService.getActiveTokensForUsers(input.userIds);
    if (!tokens.length) {
      await Promise.all(notifications.map((notification) => notificationService.markDeliveryStatus(notification._id!.toString(), { deliveryStatus: 'SKIPPED' })));
      return;
    }

    const results = await provider.send(tokens.map((token) => token.token), {
      title: input.title,
      body: input.pushBody ?? input.message,
      data: input.pushData,
    });
    await this.applyResults(
      notifications.map((item) => item.toObject()),
      tokens.map((item) => item.toObject()),
      results,
      { societyId: input.societyId, entityId: input.entityId, actorUserId: input.actorUserId, actorRole: input.actorRole }
    );
  }

  getProviderHealth() {
    return pushProviderService.getProvider().getHealth();
  }

  private async applyResults(
    notifications: any[],
    tokens: any[],
    results: any[],
    auditContext: { societyId: string; entityId: string; actorUserId: string; actorRole: string }
  ): Promise<void> {
    const grouped = new Map<string, { success: boolean; attempts: number; messageId?: string; error?: string }>();
    for (const result of results) {
      const token = tokens.find((item) => item.token === result.token);
      if (!token) continue;
      const key = token.userId.toString();
      const current = grouped.get(key) || { success: false, attempts: 0 };
      current.attempts += 1;
      current.success = current.success || result.success;
      current.messageId = current.messageId || result.messageId;
      current.error = current.error || result.errorMessage;
      grouped.set(key, current);
      if (!result.success && `${result.errorCode || ''}`.includes('registration-token')) {
        await notificationDeviceTokenService.invalidateToken(result.token, result.errorMessage || 'Invalid token');
      }
    }

    await Promise.all(
      notifications.map(async (notification) => {
        const result = grouped.get(notification.userId.toString());
        if (!result) {
          await notificationService.markDeliveryStatus(notification._id.toString(), { deliveryStatus: 'SKIPPED' });
          return;
        }
        await notificationService.markDeliveryStatus(notification._id.toString(), {
          deliveryStatus: result.success ? 'SENT' : 'FAILED',
          deliveryAttempts: result.attempts,
          providerMessageId: result.messageId,
          lastDeliveryAttemptAt: new Date(),
          lastDeliveryError: result.error,
        });
      })
    );

    const failedCount = Array.from(grouped.values()).filter((item) => !item.success).length;
    if (failedCount > 0) {
      await auditService.log({
        societyId: auditContext.societyId,
        actorUserId: auditContext.actorUserId,
        actorRole: auditContext.actorRole,
        moduleCode: 'VISITOR',
        action: 'VISITOR_NOTIFICATION_FAILED',
        entityType: 'VisitorRequest',
        entityId: auditContext.entityId,
        newValue: { failedCount },
        ipAddress: '',
      });
    }

    logger.info(`Visitor notifications dispatched to ${notifications.length} users`);
  }
}

export const visitorNotificationService = new VisitorNotificationService();
