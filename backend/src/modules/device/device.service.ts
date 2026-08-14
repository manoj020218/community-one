import { v4 as uuidv4 } from 'uuid';
import { Device, IDeviceDocument } from './device.model';
import { DeviceEventLog, IDeviceEventLogDocument } from './deviceEventLog.model';
import { getAdapter } from './adapters/registry';
import { sanitizeRawBody } from './sanitizeRawBody';
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
  async pushEvent(apiKey: string, rawBody: unknown): Promise<IDeviceEventLogDocument> {
    const device = await Device.findOne({ apiKey, isActive: true });
    if (!device) throw new AuthenticationError('Invalid device API key');

    const adapter = getAdapter(device.make);
    const parsed = adapter
      ? adapter.parse(rawBody, device.deviceTimezoneOffsetMinutes)
      : { events: [], warning: `No adapter registered for make "${device.make}"` };

    await Device.findByIdAndUpdate(device._id, { lastHeartbeatAt: new Date(), onlineStatus: true });

    return DeviceEventLog.create({
      deviceId: device._id,
      societyId: device.societyId,
      make: device.make,
      rawBody: sanitizeRawBody(rawBody),
      parsedEvents: parsed.events,
      warning: parsed.warning,
    });
  }

  async listEventLogs(deviceId: string, limit: number): Promise<IDeviceEventLogDocument[]> {
    return DeviceEventLog.find({ deviceId }).sort({ receivedAt: -1 }).limit(limit);
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
