import { ConflictError, NotFoundError } from '../../common/errors/AppError';
import { Device } from '../device/device.model';
import { BindDeviceDto, CreateZoneDto, UpdateZoneDto } from './access-control.types';
import { IZoneDocument, Zone } from './zone.model';
import { IZoneDeviceBindingDocument, ZoneDeviceBinding } from './zoneDeviceBinding.model';

export class ZoneService {
  async create(dto: CreateZoneDto, createdBy: string): Promise<IZoneDocument> {
    return Zone.create({ ...dto, createdBy });
  }

  async listBySociety(societyId: string): Promise<IZoneDocument[]> {
    return Zone.find({ societyId, isActive: true }).sort({ name: 1 });
  }

  async findById(id: string): Promise<IZoneDocument> {
    const zone = await Zone.findOne({ _id: id, isActive: true });
    if (!zone) throw new NotFoundError('Zone');
    return zone;
  }

  async update(id: string, dto: UpdateZoneDto): Promise<IZoneDocument> {
    const zone = await Zone.findOneAndUpdate({ _id: id, isActive: true }, dto, { new: true, runValidators: true });
    if (!zone) throw new NotFoundError('Zone');
    return zone;
  }

  async bindDevice(zoneId: string, dto: BindDeviceDto, createdBy: string): Promise<IZoneDeviceBindingDocument> {
    const zone = await this.findById(zoneId);
    const device = await Device.findOne({ _id: dto.deviceId, societyId: zone.societyId, isActive: true });
    if (!device) throw new NotFoundError('Device');

    const existing = await ZoneDeviceBinding.findOne({ zoneId, deviceId: dto.deviceId });
    if (existing) {
      if (existing.isActive) throw new ConflictError('This device is already bound to this zone');
      existing.isActive = true;
      await existing.save();
      return existing;
    }

    return ZoneDeviceBinding.create({ societyId: zone.societyId, zoneId, deviceId: dto.deviceId, createdBy });
  }

  async listBindingsByZone(zoneId: string): Promise<IZoneDeviceBindingDocument[]> {
    return ZoneDeviceBinding.find({ zoneId, isActive: true }).populate('deviceId', 'deviceName deviceType make');
  }

  async listBindingsBySociety(societyId: string): Promise<IZoneDeviceBindingDocument[]> {
    return ZoneDeviceBinding.find({ societyId, isActive: true });
  }

  async findBindingById(bindingId: string): Promise<IZoneDeviceBindingDocument> {
    const binding = await ZoneDeviceBinding.findById(bindingId);
    if (!binding) throw new NotFoundError('Zone device binding');
    return binding;
  }

  async unbindDevice(bindingId: string): Promise<void> {
    const binding = await this.findBindingById(bindingId);
    binding.isActive = false;
    await binding.save();
  }
}

export const zoneService = new ZoneService();
