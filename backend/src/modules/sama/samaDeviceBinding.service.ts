import { buildPaginatedResult, parsePagination } from '../../common/utils/response';
import { Device } from '../device/device.model';
import { SamaActorContext } from './sama.access.service';
import { EdgeFolioAccessClient } from './edgeFolioAccess.client';
import { SamaDeviceBinding } from './samaDeviceBinding.model';
import { samaDeviceBindingCreateSchema, samaDeviceBindingListQuerySchema, samaDeviceBindingUpdateSchema } from './samaDeviceBinding.schemas';
import { samaSourceService } from './samaSource.service';
import { parseOrThrow } from './sama.validation';

export class SamaDeviceBindingService {
  async listBySociety(societyId: string, input: unknown) {
    const query = parseOrThrow(samaDeviceBindingListQuerySchema, input);
    const filter: Record<string, unknown> = { societyId };
    if (query.externalDeviceType) filter.externalDeviceType = query.externalDeviceType;
    if (typeof query.isActive === 'boolean') filter.isActive = query.isActive;
    const { page, limit, skip } = parsePagination(query);
    const [items, total] = await Promise.all([
      SamaDeviceBinding.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      SamaDeviceBinding.countDocuments(filter),
    ]);
    return buildPaginatedResult(items, total, page, limit);
  }

  async listExternalDevices(societyId: string) {
    const client = new EdgeFolioAccessClient(await samaSourceService.getClientConfig(societyId));
    const [m68, u5, bindings] = await Promise.all([
      client.listM68Devices(),
      client.listU5Devices(),
      SamaDeviceBinding.find({ societyId, sourceProvider: 'EDGEFOLIO' }).lean(),
    ]);
    const bindingMap = new Map(bindings.map((item) => [`${item.externalDeviceType}:${item.externalDeviceId}`, item]));
    return [...m68.map((item) => this.mapExternal('M68', item.devId, item.name, bindingMap)), ...u5.map((item) => this.mapExternal('U5', item.deviceSn, item.deviceName, bindingMap))];
  }

  async create(context: SamaActorContext, input: unknown) {
    const dto = parseOrThrow(samaDeviceBindingCreateSchema, input);
    const device = await Device.findOne({ _id: dto.jenixDeviceId, societyId: context.societyId, isActive: true }).orFail();
    return SamaDeviceBinding.create({
      societyId: context.societyId,
      sourceProvider: 'EDGEFOLIO',
      ...dto,
      gateId: device.gateId,
      createdBy: context.user.userId,
      updatedBy: context.user.userId,
    });
  }

  async update(context: SamaActorContext, bindingId: string, input: unknown) {
    const dto = parseOrThrow(samaDeviceBindingUpdateSchema, input);
    const nextValues: Record<string, unknown> = { ...dto, updatedBy: context.user.userId };
    if (dto.jenixDeviceId) {
      const device = await Device.findOne({ _id: dto.jenixDeviceId, societyId: context.societyId, isActive: true }).orFail();
      nextValues.gateId = device.gateId;
    }
    return SamaDeviceBinding.findOneAndUpdate(
      { _id: bindingId, societyId: context.societyId },
      { $set: nextValues },
      { new: true }
    ).orFail();
  }

  private mapExternal(type: 'M68' | 'U5', id: string, name: string | undefined, bindingMap: Map<string, any>) {
    const binding = bindingMap.get(`${type}:${id}`);
    return {
      externalDeviceType: type,
      externalDeviceId: id,
      externalDeviceName: name || id,
      isBound: Boolean(binding),
      bindingId: binding?._id?.toString(),
      jenixDeviceId: binding?.jenixDeviceId?.toString(),
      isActive: binding?.isActive ?? null,
    };
  }
}

export const samaDeviceBindingService = new SamaDeviceBindingService();
