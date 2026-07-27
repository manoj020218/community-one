import { buildPaginatedResult, parsePagination } from '../../common/utils/response';
import { SamaActorContext } from './sama.access.service';
import { AccessPolicy } from './accessPolicy.model';
import { accessPolicyCreateSchema, accessPolicyListQuerySchema, accessPolicyUpdateSchema } from './accessPolicy.schemas';
import { samaSubjectService } from './samaSubject.service';
import { parseOrThrow } from './sama.validation';

export class AccessPolicyService {
  async listBySociety(societyId: string, input: unknown) {
    const query = parseOrThrow(accessPolicyListQuerySchema, input);
    const filter: Record<string, unknown> = { societyId };
    if (query.subjectType) filter.subjectType = query.subjectType;
    if (query.subjectId) filter.subjectId = query.subjectId;
    if (query.status) filter.status = query.status;
    const { page, limit, skip } = parsePagination(query);
    const [items, total] = await Promise.all([
      AccessPolicy.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      AccessPolicy.countDocuments(filter),
    ]);
    return buildPaginatedResult(items, total, page, limit);
  }

  async create(context: SamaActorContext, input: unknown) {
    const dto = parseOrThrow(accessPolicyCreateSchema, input);
    await samaSubjectService.ensureExists(context.societyId, dto.subjectType, dto.subjectId);
    return AccessPolicy.create({
      societyId: context.societyId,
      ...dto,
      createdBy: context.user.userId,
      updatedBy: context.user.userId,
    });
  }

  async update(context: SamaActorContext, policyId: string, input: unknown) {
    const dto = parseOrThrow(accessPolicyUpdateSchema, input);
    return AccessPolicy.findOneAndUpdate(
      { _id: policyId, societyId: context.societyId },
      { $set: { ...dto, updatedBy: context.user.userId } },
      { new: true }
    ).orFail();
  }
}

export const accessPolicyService = new AccessPolicyService();
