import { communicationService } from '../communication/communication.service';
import { whatsAppService } from '../communication/whatsapp.service';
import { notificationService } from '../notification/notification.service';
import { Resident } from '../resident/resident.model';
import { McrNotificationDispatch } from './mcrNotificationDispatch.model';
import { mcrReceiptPublicService } from './mcrReceiptPublic.service';
import { mcrReceiptQueryService } from './mcrReceiptQuery.service';
import { receiptSendSchema } from './mcrReceipt.schemas';
import { parseOrThrow } from './mcr.validation';

function money(value: number) {
  return `INR ${(value / 100).toFixed(2)}`;
}

export class McrDispatchService {
  async sendReceipt(
    societyId: string,
    receiptId: string,
    input: unknown,
    verifyBaseUrl: string,
    publicDocumentBaseUrl: string
  ) {
    const dto = parseOrThrow(receiptSendSchema, input);
    const receipt = await mcrReceiptQueryService.findById(societyId, receiptId);
    const resident = receipt.residentId
      ? await Resident.findOne({ _id: receipt.residentId, societyId }).select('userId name mobile email')
      : null;
    const share = await mcrReceiptPublicService.buildShareInfo(receipt, verifyBaseUrl, publicDocumentBaseUrl);
    const message = `Receipt ${receipt.receiptNumber} for ${money(receipt.amountPaise)} has been issued.${share?.documentUrl ? ` View: ${share.documentUrl}` : ''}`;
    const results = [];

    for (const channel of dto.channels) {
      try {
        if (channel === 'IN_APP') {
          if (!resident?.userId) results.push(await this.record(receipt, channel, 'SKIPPED', undefined, 'Resident user is not linked'));
          else {
            await notificationService.create({
              societyId,
              userId: resident.userId.toString(),
              title: `Receipt ${receipt.receiptNumber}`,
              message,
              type: 'PAYMENT',
              moduleCode: 'MCR',
              actionUrl: `/mcr/receipts/${receiptId}`,
              entityType: 'McrReceipt',
              entityId: receiptId,
            });
            results.push(await this.record(receipt, channel, 'SENT', resident.userId.toString()));
          }
        }

        if (channel === 'EMAIL') {
          const email = dto.email || receipt.residentSnapshot.email;
          const settings = await communicationService.getSettings(societyId);
          if (!email) results.push(await this.record(receipt, channel, 'SKIPPED', undefined, 'Receipt email destination is missing'));
          else if (!settings.smtp.enabled) results.push(await this.record(receipt, channel, 'SKIPPED', email, 'SMTP is disabled'));
          else {
            await communicationService.sendEmail(societyId, {
              toEmail: email,
              subject: `Receipt ${receipt.receiptNumber}`,
              text: message,
              html: `<p>${message}</p>`,
            });
            results.push(await this.record(receipt, channel, 'SENT', email));
          }
        }

        if (channel === 'WHATSAPP') {
          const mobile = dto.mobile || receipt.residentSnapshot.mobile;
          const status = await whatsAppService.getStatus(societyId);
          if (!mobile) results.push(await this.record(receipt, channel, 'SKIPPED', undefined, 'Receipt mobile destination is missing'));
          else if (status.status !== 'CONNECTED') results.push(await this.record(receipt, channel, 'SKIPPED', mobile, 'WhatsApp is not connected'));
          else {
            await whatsAppService.sendMessage(societyId, mobile, message);
            results.push(await this.record(receipt, channel, 'SENT', mobile));
          }
        }

        if (channel === 'SMS') {
          results.push(await this.record(receipt, channel, 'SKIPPED', dto.mobile || receipt.residentSnapshot.mobile, 'SMS provider is not configured'));
        }
      } catch (error: any) {
        results.push(await this.record(receipt, channel, 'FAILED', dto.email || dto.mobile, error.message));
      }
    }

    return { receiptId, receiptNumber: receipt.receiptNumber, share, results };
  }

  private async record(receipt: any, channel: string, status: string, destination?: string, failureMessage?: string) {
    const dispatch = await McrNotificationDispatch.create({
      societyId: receipt.societyId,
      eventType: 'RECEIPT_SHARED',
      entityType: 'McrReceipt',
      entityId: receipt._id!.toString(),
      flatId: receipt.flatId,
      residentId: receipt.residentId,
      channel,
      status,
      attemptCount: 1,
      destinationMasked: destination ? this.mask(destination) : undefined,
      sentAt: status === 'SENT' ? new Date() : undefined,
      failedAt: status === 'FAILED' ? new Date() : undefined,
      failureMessage,
    });
    return { channel, status, dispatchId: dispatch._id!.toString(), destinationMasked: dispatch.destinationMasked, failureMessage };
  }

  private mask(value: string) {
    return value.length <= 4 ? value : `${'*'.repeat(value.length - 4)}${value.slice(-4)}`;
  }
}

export const mcrDispatchService = new McrDispatchService();
