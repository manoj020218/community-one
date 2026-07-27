import { buildPaginatedResult, parsePagination } from '../../common/utils/response';
import { SamaActorContext } from './sama.access.service';
import { parseOrThrow } from './sama.validation';
import { StaffCategory } from './staffCategory.model';
import { staffCategoryCreateSchema, staffCategoryListQuerySchema, staffCategoryUpdateSchema } from './staffCategory.schemas';

export class StaffCategoryService {
  async listBySociety(societyId: string, input: unknown) {
    const query = parseOrThrow(staffCategoryListQuerySchema, input);
    const filter: Record<string, unknown> = { societyId };
    if (typeof query.isActive === 'boolean') filter.isActive = query.isActive;
    const { page, limit, skip } = parsePagination(query);
    const [items, total] = await Promise.all([
      StaffCategory.find(filter).sort({ code: 1 }).skip(skip).limit(limit),
      StaffCategory.countDocuments(filter),
    ]);
    return buildPaginatedResult(items, total, page, limit);
  }

  async create(context: SamaActorContext, input: unknown) {
    const dto = parseOrThrow(staffCategoryCreateSchema, input);
    return StaffCategory.create({
      societyId: context.societyId,
      ...dto,
      code: dto.code.toUpperCase(),
      createdBy: context.user.userId,
      updatedBy: context.user.userId,
    });
  }

  async update(context: SamaActorContext, categoryId: string, input: unknown) {
    const dto = parseOrThrow(staffCategoryUpdateSchema, input);
    return StaffCategory.findOneAndUpdate(
      { _id: categoryId, societyId: context.societyId },
      { $set: { ...dto, updatedBy: context.user.userId } },
      { new: true }
    ).orFail();
  }
}

export const staffCategoryService = new StaffCategoryService();
