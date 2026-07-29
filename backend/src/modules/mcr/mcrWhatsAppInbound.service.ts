import { logger } from '../../common/utils/logger';
import { MODULE_CODES } from '../../config/constants';
import { InboundImagePayload } from '../communication/whatsapp.service';
import { fileAssetService } from '../fileAsset/fileAsset.service';
import { moduleRegistryService } from '../moduleRegistry/moduleRegistry.service';
import { notificationService } from '../notification/notification.service';
import { User } from '../user/user.model';
import { MaintenanceDemand } from './demand.model';
import { McrNotificationDispatch } from './mcrNotificationDispatch.model';
import { McrSettings } from './mcrSettings.model';
import { mcrPaymentService } from './mcrPayment.service';

const ADMIN_ROLE_CODES = ['SOCIETY_ADMIN', 'ACCOUNTANT'];

/** Resolves an inbound WhatsApp photo reply against MCR's own records. Registered into
 * whatsAppService.onInboundImage() at server boot — see server.ts — so the communication
 * module stays unaware of MCR (or whether it's even enabled for a given society). */
export class McrWhatsAppInboundService {
  async handle(societyId: string, payload: InboundImagePayload): Promise<void> {
    const enabled = await moduleRegistryService.isModuleEnabled(societyId, MODULE_CODES.MCR);
    if (!enabled) return;

    const settings = await McrSettings.findOne({ societyId });
    if (!settings?.allowResidentPaymentSubmission) return;

    const dispatch = payload.quotedMessageId
      ? await McrNotificationDispatch.findOne({ societyId, channel: 'WHATSAPP', providerMessageId: payload.quotedMessageId, entityType: 'MaintenanceDemand' })
      : null;

    if (!dispatch) {
      await this.notifyUnmatched(societyId, payload, settings.updatedBy.toString());
      return;
    }

    const demand = await MaintenanceDemand.findOne({ _id: dispatch.entityId, societyId });
    if (!demand || demand.outstandingPaise <= 0) {
      await this.notifyUnmatched(societyId, payload, settings.updatedBy.toString(), 'This demand appears to already be settled — please review manually.');
      return;
    }

    try {
      const proof = await fileAssetService.saveBuffer(payload.buffer, settings.updatedBy.toString(), {
        societyId,
        moduleCode: 'MCR',
        entityType: 'MCR_PAYMENT_PROOF',
        mimeType: payload.mimeType,
        originalName: `whatsapp-${Date.now()}.jpg`,
      });

      const payment = await mcrPaymentService.createInboundWhatsAppPayment(societyId, {
        flatId: demand.flatId,
        amountPaise: demand.outstandingPaise,
        proofFileId: proof._id!.toString(),
        systemActorUserId: settings.updatedBy.toString(),
        notes: payload.caption ? `WhatsApp reply: ${payload.caption}` : 'Submitted via WhatsApp reply',
      });

      await this.notifyAdmins(societyId, {
        title: 'Payment screenshot received via WhatsApp',
        message: `${demand.flatSnapshot?.['flatNo'] || 'A resident'} sent a payment screenshot for ${demand.billingPeriodLabel} — please verify.`,
        actionUrl: '/mcr?tab=payments',
        entityType: 'McrPaymentRecord',
        entityId: payment._id!.toString(),
      });
    } catch (error: any) {
      logger.warn('Failed to auto-create MCR payment from WhatsApp reply', { societyId, err: error?.message });
      await this.notifyUnmatched(societyId, payload, settings.updatedBy.toString(), 'We received a payment screenshot but could not auto-file it — please review manually.');
    }
  }

  private async notifyUnmatched(societyId: string, payload: InboundImagePayload, systemActorUserId: string, note?: string): Promise<void> {
    try {
      const proof = await fileAssetService.saveBuffer(payload.buffer, systemActorUserId, {
        societyId,
        moduleCode: 'MCR',
        entityType: 'MCR_WHATSAPP_UNMATCHED',
        mimeType: payload.mimeType,
        originalName: `whatsapp-${Date.now()}.jpg`,
      });
      await this.notifyAdmins(societyId, {
        title: 'Unmatched WhatsApp payment screenshot',
        message: note || `Received an image from +${payload.fromMobile} that isn't a reply to a payment reminder — please review manually.`,
        actionUrl: proof.url,
        entityType: 'FileAsset',
        entityId: proof._id!.toString(),
      });
    } catch (error: any) {
      logger.warn('Failed to save unmatched WhatsApp image', { societyId, err: error?.message });
    }
  }

  private async notifyAdmins(societyId: string, dto: { title: string; message: string; actionUrl: string; entityType: string; entityId: string }): Promise<void> {
    const admins = await User.find({ societyId, roleCode: { $in: ADMIN_ROLE_CODES }, isActive: true }).select('_id');
    if (!admins.length) return;
    await notificationService.createBulk(
      admins.map((admin) => ({
        societyId,
        userId: admin._id!.toString(),
        title: dto.title,
        message: dto.message,
        type: 'PAYMENT',
        moduleCode: 'MCR',
        actionUrl: dto.actionUrl,
        entityType: dto.entityType,
        entityId: dto.entityId,
      }))
    );
  }
}

export const mcrWhatsAppInboundService = new McrWhatsAppInboundService();
