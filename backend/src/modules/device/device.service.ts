import { v4 as uuidv4 } from 'uuid';
import { Device, IDeviceDocument } from './device.model';
import { NotFoundError, AuthenticationError } from '../../common/errors/AppError';

export interface CreateDeviceDto {
  societyId: string;
  deviceName: string;
  deviceType: string;
  deviceCode: string;
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
    return Device.find({ societyId, isActive: true }).sort({ deviceName: 1 });
  }

  async findById(id: string): Promise<IDeviceDocument> {
    const device = await Device.findById(id);
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
