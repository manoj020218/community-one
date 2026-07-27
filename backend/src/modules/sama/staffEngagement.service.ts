import { ValidationError } from '../../common/errors/AppError';
import { buildPaginatedResult, parsePagination } from '../../common/utils/response';
import { Flat } from '../flat/flat.model';
import { Resident } from '../resident/resident.model';
import { SamaActorContext } from './sama.access.service';
import { StaffEngagement } from './staffEngagement.model';
import { staffEngagementCreateSchema, staffEngagementListQuerySchema } from './staffEngagement.schemas';
import { StaffProfile } from './staffProfile.model';
import { parseOrThrow } from './sama.validation';

export class StaffEngagementService {
  async listBySociety(societyId: string, input: unknown) {
    const query = parseOrThrow(staffEngagementListQuerySchema, input);
    const filter: Record<string, unknown> = { societyId };
    if (query.staffProfileId) filter.staffProfileId = query.staffProfileId;
    if (query.status) filter.status = query.status;
    const { page, limit, skip } = parsePagination(query);
    const [items, total] = await Promise.all([
      StaffEngagement.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      StaffEngagement.countDocuments(filter),
    ]);
    return buildPaginatedResult(items, total, page, limit);
  }

  async create(context: SamaActorContext, input: unknown) {
    const dto = parseOrThrow(staffEngagementCreateSchema, input);
    await StaffProfile.findOne({ _id: dto.staffProfileId, societyId: context.societyId }).orFail();
    if (dto.employerType === 'HOUSEHOLD') await this.assertHouseholdTargets(context.societyId, dto.employerFlatId, dto.employerResidentId);
    if (dto.employerType !== 'HOUSEHOLD' && (dto.employerFlatId || dto.employerResidentId)) {
      throw new ValidationError('Household employer details are only allowed for household engagements');
    }
    return StaffEngagement.create({ societyId: context.societyId, ...dto, status: 'ACTIVE', createdBy: context.user.userId, updatedBy: context.user.userId });
  }

  private async assertHouseholdTargets(societyId: string, flatId?: string, residentId?: string) {
    if (!flatId || !residentId) throw new ValidationError('Household engagements require employerFlatId and employerResidentId');
    const [flat, resident] = await Promise.all([
      Flat.findOne({ _id: flatId, societyId }),
      Resident.findOne({ _id: residentId, societyId, flatId }),
    ]);
    if (!flat || !resident) throw new ValidationError('Household employer targets are invalid');
  }
}

export const staffEngagementService = new StaffEngagementService();
