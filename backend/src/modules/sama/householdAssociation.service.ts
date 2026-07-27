import { ForbiddenError, ValidationError } from '../../common/errors/AppError';
import { buildPaginatedResult, parsePagination } from '../../common/utils/response';
import { Resident } from '../resident/resident.model';
import { SamaActorContext } from './sama.access.service';
import { HouseholdAssociation } from './householdAssociation.model';
import { householdAssociationCreateSchema, householdAssociationListQuerySchema } from './householdAssociation.schemas';
import { StaffEngagement } from './staffEngagement.model';
import { StaffProfile } from './staffProfile.model';
import { parseOrThrow } from './sama.validation';

export class HouseholdAssociationService {
  async listForActor(context: SamaActorContext, input: unknown) {
    const query = parseOrThrow(householdAssociationListQuerySchema, input);
    const filter: Record<string, unknown> = { societyId: context.societyId };
    if (query.status) filter.status = query.status;
    if (query.flatId) filter.flatId = query.flatId;
    if (!context.user.permissions.includes('sama.view_society') && context.user.flatId) filter.flatId = context.user.flatId;
    const { page, limit, skip } = parsePagination(query);
    const [items, total] = await Promise.all([
      HouseholdAssociation.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      HouseholdAssociation.countDocuments(filter),
    ]);
    return buildPaginatedResult(items, total, page, limit);
  }

  async create(context: SamaActorContext, input: unknown) {
    const dto = parseOrThrow(householdAssociationCreateSchema, input);
    const [staff, engagement, resident] = await Promise.all([
      StaffProfile.findOne({ _id: dto.staffProfileId, societyId: context.societyId }),
      StaffEngagement.findOne({ _id: dto.engagementId, societyId: context.societyId, staffProfileId: dto.staffProfileId }),
      Resident.findOne({ _id: dto.residentId, societyId: context.societyId, flatId: dto.flatId }),
    ]);
    if (!staff || !engagement || !resident) throw new ValidationError('Staff, engagement, flat, or resident is invalid for this society');
    if (engagement.engagementType !== 'HOUSEHOLD_DIRECT' || engagement.employerType !== 'HOUSEHOLD') {
      throw new ValidationError('Only household-direct engagements can create household associations');
    }
    return HouseholdAssociation.create({ societyId: context.societyId, ...dto, status: 'PENDING_RESIDENT_APPROVAL', createdBy: context.user.userId, updatedBy: context.user.userId });
  }

  async approveByResident(context: SamaActorContext, associationId: string) {
    const association = await HouseholdAssociation.findOne({ _id: associationId, societyId: context.societyId }).orFail();
    if (!context.user.flatId || context.user.flatId !== association.flatId.toString()) throw new ForbiddenError('This household association does not belong to your flat');
    association.residentApprovedAt = association.residentApprovedAt || new Date();
    association.residentApprovedByUserId = context.user.userId;
    association.status = association.societyApprovedAt ? 'ACTIVE' : 'PENDING_SOCIETY_APPROVAL';
    association.updatedBy = context.user.userId;
    await association.save();
    return association;
  }

  async approveBySociety(context: SamaActorContext, associationId: string) {
    const association = await HouseholdAssociation.findOne({ _id: associationId, societyId: context.societyId }).orFail();
    association.societyApprovedAt = association.societyApprovedAt || new Date();
    association.societyApprovedByUserId = context.user.userId;
    association.status = association.residentApprovedAt ? 'ACTIVE' : 'PENDING_RESIDENT_APPROVAL';
    association.updatedBy = context.user.userId;
    await association.save();
    return association;
  }
}

export const householdAssociationService = new HouseholdAssociationService();
