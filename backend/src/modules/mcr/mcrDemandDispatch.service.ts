import { communicationService } from '../communication/communication.service';
import { whatsAppService } from '../communication/whatsapp.service';
import { notificationService } from '../notification/notification.service';
import { Resident } from '../resident/resident.model';
import { MaintenanceDemand } from './demand.model';
import { McrNotificationDispatch } from './mcrNotificationDispatch.model';
import { mcrSettingsService } from './mcrSettings.service';
import { buildUpiLink } from './mcrUpi.util';

function money(value: number) {
  return `INR ${(value / 100).toFixed(2)}`;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class McrDemandDispatchService {
  async sendReminder(societyId: string, demandId: string, channels: string[]) {
    const demand = await MaintenanceDemand.findOne({ _id: demandId, societyId }).orFail();
    const residents = await Resident.find({
      societyId,
      flatId: demand.flatId,
      status: 'ACTIVE',
      isActive: true,
      primaryContact: true,
    }).select('userId name mobile email');
    const eventDate = new Date().toISOString().slice(0, 10);
    const title = `Maintenance reminder for ${demand.billingPeriodLabel}`;
    const message = `Outstanding amount ${money(demand.outstandingPaise)} is due for flat ${demand.flatSnapshot?.['flatNo'] || ''}.`;
    const results = [];
    const settings = await mcrSettingsService.getBySociety(societyId, demand.createdBy);
    const waMessage = settings.collectionUpiId
      ? `${message}\n\nPay via UPI: ${buildUpiLink(settings.collectionUpiId, settings.collectionUpiPayeeName || 'Society Maintenance', demand.outstandingPaise)}` +
        (settings.allowResidentPaymentSubmission ? '\n\nAfter paying, reply to THIS message with a screenshot of the payment confirmation so we can verify it.' : '')
      : message;

    if (!residents.length) {
      results.push(await this.record(demand, 'IN_APP', 'SKIPPED', 'NO_RESIDENT', 'No active resident is linked to this flat', eventDate));
      return { sentCount: 0, skippedCount: 1, duplicateCount: 0, results };
    }

    for (const resident of residents) {
      for (const channel of channels) {
        const destination = this.destinationFor(channel, resident);
        const key = `${eventDate}:${demandId}:${channel}:${destination || resident._id}`;
        const existing = await McrNotificationDispatch.findOne({ societyId, idempotencyKey: key });
        if (existing) {
          results.push({ channel, status: 'DUPLICATE', destinationMasked: existing.destinationMasked });
          continue;
        }

        try {
          if (channel === 'IN_APP') {
            if (!resident.userId) results.push(await this.record(demand, channel, 'SKIPPED', key, 'Resident user is not linked', eventDate, destination));
            else {
              await notificationService.create({
                societyId,
                userId: resident.userId.toString(),
                title,
                message,
                type: 'PAYMENT',
                moduleCode: 'MCR',
                actionUrl: `/mcr/demands/${demandId}`,
                entityType: 'MaintenanceDemand',
                entityId: demandId,
              });
              results.push(await this.record(demand, channel, 'SENT', key, undefined, eventDate, resident.userId.toString()));
            }
          }

          if (channel === 'EMAIL') {
            const settings = await communicationService.getSettings(societyId);
            if (!resident.email) results.push(await this.record(demand, channel, 'SKIPPED', key, 'Resident email is missing', eventDate));
            else if (!settings.smtp.enabled) results.push(await this.record(demand, channel, 'SKIPPED', key, 'SMTP is disabled', eventDate, resident.email));
            else {
              await communicationService.sendEmail(societyId, { toEmail: resident.email, subject: title, text: message, html: `<p>${message}</p>` });
              results.push(await this.record(demand, channel, 'SENT', key, undefined, eventDate, resident.email));
            }
          }

          if (channel === 'WHATSAPP') {
            const status = await whatsAppService.getStatus(societyId);
            if (!resident.mobile) results.push(await this.record(demand, channel, 'SKIPPED', key, 'Resident mobile is missing', eventDate));
            else if (status.status !== 'CONNECTED') results.push(await this.record(demand, channel, 'SKIPPED', key, 'WhatsApp is not connected', eventDate, resident.mobile));
            else {
              const sent = await whatsAppService.sendMessage(societyId, resident.mobile, waMessage);
              results.push(await this.record(demand, channel, 'SENT', key, undefined, eventDate, resident.mobile, sent.id));
              await sleep(2000); // spread bursts out — reduces the chance of automated-traffic detection on the linked WhatsApp number
            }
          }

          if (channel === 'SMS') {
            results.push(await this.record(demand, channel, 'SKIPPED', key, 'SMS provider is not configured', eventDate, resident.mobile));
          }
        } catch (error: any) {
          results.push(await this.record(demand, channel, 'FAILED', key, error.message, eventDate, destination));
        }
      }
    }

    return {
      sentCount: results.filter((item) => item.status === 'SENT').length,
      skippedCount: results.filter((item) => item.status === 'SKIPPED').length,
      duplicateCount: results.filter((item) => item.status === 'DUPLICATE').length,
      results,
    };
  }

  private destinationFor(channel: string, resident: any) {
    if (channel === 'IN_APP') return resident.userId?.toString();
    if (channel === 'EMAIL') return resident.email;
    if (channel === 'WHATSAPP' || channel === 'SMS') return resident.mobile;
    return undefined;
  }

  private async record(demand: any, channel: string, status: string, key: string, failureMessage?: string, eventDate?: string, destination?: string, providerMessageId?: string) {
    const dispatch = await McrNotificationDispatch.create({
      societyId: demand.societyId,
      eventType: 'DEMAND_REMINDER',
      entityType: 'MaintenanceDemand',
      entityId: demand._id!.toString(),
      flatId: demand.flatId,
      channel,
      status,
      attemptCount: 1,
      destinationMasked: destination ? this.mask(destination) : undefined,
      providerMessageId,
      sentAt: status === 'SENT' ? new Date() : undefined,
      failedAt: status === 'FAILED' ? new Date() : undefined,
      failureMessage,
      idempotencyKey: key || `${eventDate}:${demand._id}:${channel}`,
    });
    return { channel, status, destinationMasked: dispatch.destinationMasked, failureMessage };
  }

  private mask(value: string) {
    return value.length <= 4 ? value : `${'*'.repeat(value.length - 4)}${value.slice(-4)}`;
  }
}

export const mcrDemandDispatchService = new McrDemandDispatchService();
