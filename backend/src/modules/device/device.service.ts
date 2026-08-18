import { v4 as uuidv4 } from 'uuid';
import { Device, IDeviceDocument } from './device.model';
import { DeviceEventLog, IDeviceEventLogDocument } from './deviceEventLog.model';
import { getAdapter } from './adapters/registry';
import { sanitizeRawBody } from './sanitizeRawBody';
import { createPhotoRequest, getPendingRequestForDevice, fulfillPhotoRequest, consumePhotoRequest } from './photoRequest.store';
import { NotFoundError, AuthenticationError } from '../../common/errors/AppError';
import { NormalizedMovementEvent } from './adapters/deviceAdapter.types';
import { AccessZoneCredential } from '../access-control/accessCredential.model';
import { Resident } from '../resident/resident.model';
import { whatsAppService } from '../communication/whatsapp.service';
import { logger } from '../../common/utils/logger';

export interface CreateDeviceDto {
  societyId: string;
  deviceName: string;
  deviceType: string;
  deviceCode: string;
  gateId?: string;
  gateName?: string;
  location?: string;
  ipAddress?: string;
  macAddress?: string;
  firmwareVersion?: string;
  mappedModuleCode?: string;
}

export interface HeartbeatDto {
  firmwareVersion?: string;
  ipAddress?: string;
  metadata?: Record<string, any>;
}

export interface HealthReportDto {
  firmwareVersion?: string;
  ipAddress?: string;
  freeHeap?: number;
  wifiRssi?: number;
  uptimeSeconds?: number;
  resetReason?: string;
}

/** Reverses the adapter's UTC conversion, back to the "YYYY-MM-DD HH:MM:SS" string the device's own
 *  API reports timestamps in — a photo request has to match by the device's own string, not our UTC one. */
function toDeviceLocalTimeString(utcTimestamp: string, deviceTimezoneOffsetMinutes: number): string {
  const local = new Date(new Date(utcTimestamp).getTime() + deviceTimezoneOffsetMinutes * 60_000);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${local.getUTCFullYear()}-${pad(local.getUTCMonth() + 1)}-${pad(local.getUTCDate())} `
    + `${pad(local.getUTCHours())}:${pad(local.getUTCMinutes())}:${pad(local.getUTCSeconds())}`;
}

export class DeviceService {
  async create(dto: CreateDeviceDto, createdBy: string): Promise<IDeviceDocument> {
    const apiKey = uuidv4().replace(/-/g, '');
    return Device.create({ ...dto, apiKey, createdBy });
  }

  async findBySociety(societyId: string): Promise<IDeviceDocument[]> {
    return Device.find({ societyId, isActive: true }).populate('gateId', 'name code').sort({ deviceName: 1 });
  }

  async findById(id: string): Promise<IDeviceDocument> {
    const device = await Device.findById(id).populate('gateId', 'name code');
    if (!device || !device.isActive) throw new NotFoundError('Device');
    return device;
  }

  async update(id: string, dto: Partial<CreateDeviceDto>): Promise<IDeviceDocument> {
    const device = await Device.findByIdAndUpdate(id, dto, { new: true });
    if (!device) throw new NotFoundError('Device');
    return device;
  }

  async heartbeat(deviceId: string, apiKey: string, dto: HeartbeatDto): Promise<IDeviceDocument> {
    const device = await Device.findById(deviceId);
    if (!device) throw new NotFoundError('Device');
    if (device.apiKey !== apiKey) throw new AuthenticationError('Invalid device API key');

    const updated = await Device.findByIdAndUpdate(
      deviceId,
      {
        lastHeartbeatAt: new Date(),
        onlineStatus: true,
        ...(dto.firmwareVersion && { firmwareVersion: dto.firmwareVersion }),
        ...(dto.ipAddress && { ipAddress: dto.ipAddress }),
      },
      { new: true }
    );
    return updated!;
  }

  /**
   * Device-brand-agnostic push ingestion. Identified purely by the apiKey in the URL (no IP/serial
   * guessing) — safe for firmware that can only be configured with a fixed push URL, no headers.
   * Normalizes and logs every push, then fires a best-effort guardian WhatsApp alert for any passed
   * event that resolves to a resident with an access credential on this device (see notifyGuardians).
   */
  async pushEvent(apiKey: string, rawBody: unknown) {
    const device = await Device.findOne({ apiKey, isActive: true });
    if (!device) throw new AuthenticationError('Invalid device API key');

    const adapter = getAdapter(device.make);
    const parsed = adapter
      ? adapter.parse(rawBody, device.deviceTimezoneOffsetMinutes)
      : { events: [], warning: `No adapter registered for make "${device.make}"` };

    await Device.findByIdAndUpdate(device._id, { lastHeartbeatAt: new Date(), onlineStatus: true });

    const log = await DeviceEventLog.create({
      deviceId: device._id,
      societyId: device.societyId,
      make: device.make,
      rawBody: sanitizeRawBody(rawBody),
      parsedEvents: parsed.events,
      warning: parsed.warning,
    });

    await this.notifyGuardians(device, parsed.events);

    // Surface at most one pending on-demand photo request per poll, so the gateway is never
    // asked to fetch more than one photo at a time. Never persisted — see photoRequest.store.ts.
    const photoRequest = getPendingRequestForDevice(apiKey);
    return { log, photoRequest };
  }

  /**
   * Best-effort: resolve each passed movement event to a resident (via their AccessZoneCredential
   * on this device) and WhatsApp their guardian, if one is on file. Never lets a lookup/send failure
   * — including WhatsApp simply not being connected for this society — affect the push response;
   * the gateway must always get a clean 200 regardless of notification outcome.
   */
  private async notifyGuardians(device: IDeviceDocument, events: NormalizedMovementEvent[]): Promise<void> {
    const passedEvents = events.filter((e) => e.passed);
    if (!passedEvents.length) return;

    for (const event of passedEvents) {
      try {
        const credential = await AccessZoneCredential.findOne({
          deviceId: device._id,
          deviceExternalUserId: event.deviceExternalUserId,
          status: 'ACTIVE',
        });
        if (!credential) continue;

        const resident = await Resident.findById(credential.residentId);
        if (!resident?.guardianMobile) continue;

        const where = device.gateName || device.deviceName;
        const when = event.timestamp.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' });
        const message = `Jenix Alert: ${resident.name} was seen at ${where} on ${when}.`;
        await whatsAppService.sendMessage(String(device.societyId), resident.guardianMobile, message);
      } catch (err: any) {
        logger.warn('Guardian access-alert failed', {
          deviceId: device._id?.toString(),
          deviceExternalUserId: event.deviceExternalUserId,
          err: err?.message,
        });
      }
    }
  }

  async listEventLogs(deviceId: string, limit: number): Promise<IDeviceEventLogDocument[]> {
    return DeviceEventLog.find({ deviceId }).sort({ receivedAt: -1 }).limit(limit);
  }

  /**
   * Admin-initiated: ask the gateway to fetch one specific photo on its next poll. Never stored.
   * `checkinTimeUtc` is the normalized UTC timestamp shown in the UI (from DeviceEventLog.parsedEvents);
   * converted back to the device's own local time string since that's what the gateway will match
   * against when it re-queries the device for this record.
   */
  async requestPhoto(deviceId: string, deviceExternalUserId: string, checkinTimeUtc: string): Promise<string> {
    const device = await this.findById(deviceId);
    const deviceLocalCheckinTime = toDeviceLocalTimeString(checkinTimeUtc, device.deviceTimezoneOffsetMinutes);
    return createPhotoRequest(device.apiKey, deviceExternalUserId, deviceLocalCheckinTime);
  }

  getPhotoRequestStatus(requestId: string) {
    return consumePhotoRequest(requestId);
  }

  fulfillPhoto(apiKey: string, requestId: string, photoBase64: string): void {
    const ok = fulfillPhotoRequest(requestId, apiKey, photoBase64);
    if (!ok) throw new NotFoundError('Photo request');
  }

  /**
   * Lets a setup wizard confirm an apiKey is real and see which society/device it belongs to
   * before finishing provisioning — no device _id needed, just the key the installer pasted in.
   */
  async verifyApiKey(apiKey: string): Promise<{ deviceName: string; societyName: string }> {
    const device = await Device.findOne({ apiKey, isActive: true }).populate<{ societyId: { name: string } }>('societyId', 'name');
    if (!device) throw new AuthenticationError('Invalid device API key');
    return { deviceName: device.deviceName, societyName: device.societyId.name };
  }

  /** apiKey-path variant of heartbeat() — a gateway only knows its apiKey, not the device's Mongo _id. */
  async heartbeatByApiKey(apiKey: string, dto: HealthReportDto): Promise<void> {
    const device = await Device.findOne({ apiKey, isActive: true });
    if (!device) throw new AuthenticationError('Invalid device API key');

    await Device.findByIdAndUpdate(device._id, {
      lastHeartbeatAt: new Date(),
      onlineStatus: true,
      ...(dto.firmwareVersion && { firmwareVersion: dto.firmwareVersion }),
      ...(dto.ipAddress && { ipAddress: dto.ipAddress }),
      ...(dto.freeHeap !== undefined && { lastFreeHeap: dto.freeHeap }),
      ...(dto.wifiRssi !== undefined && { lastWifiRssi: dto.wifiRssi }),
      ...(dto.uptimeSeconds !== undefined && { lastUptimeSeconds: dto.uptimeSeconds }),
      ...(dto.resetReason && { lastResetReason: dto.resetReason }),
    });
  }

  async disable(id: string): Promise<void> {
    await Device.findByIdAndUpdate(id, { isActive: false, status: 'INACTIVE', onlineStatus: false });
  }

  async regenerateApiKey(id: string): Promise<IDeviceDocument> {
    const apiKey = uuidv4().replace(/-/g, '');
    const device = await Device.findByIdAndUpdate(id, { apiKey }, { new: true });
    if (!device) throw new NotFoundError('Device');
    return device;
  }
}

export const deviceService = new DeviceService();
