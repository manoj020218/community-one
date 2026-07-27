import { buildPaginatedResult, parsePagination } from '../../common/utils/response';
import { SamaActorContext } from './sama.access.service';
import { samaNumberingService } from './samaNumbering.service';
import { parseOrThrow } from './sama.validation';
import { ServiceProviderProfile } from './serviceProviderProfile.model';
import { serviceProviderCreateSchema, serviceProviderListQuerySchema, serviceProviderUpdateSchema } from './serviceProvider.schemas';
import { StaffProfile } from './staffProfile.model';

export class ServiceProviderService {
  async listBySociety(societyId: string, input: unknown) {
    const query = parseOrThrow(serviceProviderListQuerySchema, input);
    const filter: Record<string, unknown> = { societyId };
    if (query.providerType) filter.providerType = query.providerType;
    if (query.status) filter.status = query.status;
    if (query.category) filter.serviceCategories = query.category;
    if (query.search) {
      const term = new RegExp(query.search, 'i');
      filter.$or = [{ displayName: term }, { providerCode: term }, { mobile: term }, { contactPersonName: term }];
    }
    const { page, limit, skip } = parsePagination(query);
    const [items, total] = await Promise.all([
      ServiceProviderProfile.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      ServiceProviderProfile.countDocuments(filter),
    ]);
    return buildPaginatedResult(items, total, page, limit);
  }

  async create(context: SamaActorContext, input: unknown) {
    const dto = parseOrThrow(serviceProviderCreateSchema, input);
    if (dto.linkedStaffProfileId) await StaffProfile.findOne({ _id: dto.linkedStaffProfileId, societyId: context.societyId }).orFail();
    return ServiceProviderProfile.create({
      societyId: context.societyId,
      ...dto,
      providerCode: await samaNumberingService.nextServiceProviderCode(context.societyId),
      createdBy: context.user.userId,
      updatedBy: context.user.userId,
    });
  }

  async update(context: SamaActorContext, providerId: string, input: unknown) {
    const dto = parseOrThrow(serviceProviderUpdateSchema, input);
    if (dto.linkedStaffProfileId) await StaffProfile.findOne({ _id: dto.linkedStaffProfileId, societyId: context.societyId }).orFail();
    return ServiceProviderProfile.findOneAndUpdate(
      { _id: providerId, societyId: context.societyId },
      { $set: { ...dto, updatedBy: context.user.userId } },
      { new: true }
    ).orFail();
  }
}

export const serviceProviderService = new ServiceProviderService();
