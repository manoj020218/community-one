import { v4 as uuidv4 } from 'uuid';
import { Device, IDeviceDocument } from './device.model';
import { DeviceEventLog, IDeviceEventLogDocument } from './deviceEventLog.model';
import { getAdapter } from './adapters/registry';
import { sanitizeRawBody } from './sanitizeRawBody';
import { createPhotoRequest, getPendingRequestForDevice, fulfillPhotoRequest, consumePhotoRequest } from './photoRequest.store';
import { NotFoundError, AuthenticationError } from '../../common/errors/AppError';

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
   * Validation phase only: normalizes and logs every push so the adapter's field-name guesses can
   * be checked against what a real device actually sends. Does not yet write to a movement/attendance
   * ledger or trigger notifications — that's the next phase once the payload shape is confirmed.
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

    // Surface at most one pending on-demand photo request per poll, so the gateway is never
    // asked to fetch more than one photo at a time. Never persisted — see photoRequest.store.ts.
    const photoRequest = getPendingRequestForDevice(apiKey);
    return { log, photoRequest };
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
