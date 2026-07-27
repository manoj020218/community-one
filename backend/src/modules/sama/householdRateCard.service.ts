import { buildPaginatedResult, parsePagination } from '../../common/utils/response';
import { SamaActorContext } from './sama.access.service';
import { HouseholdAssociation } from './householdAssociation.model';
import { householdPaymentListQuerySchema, householdRateCardCreateSchema, householdRateCardUpdateSchema } from './householdPayment.schemas';
import { HouseholdRateCard } from './householdRateCard.model';
import { parseOrThrow } from './sama.validation';

export class HouseholdRateCardService {
  async listForActor(context: SamaActorContext, input: unknown) {
    const query = parseOrThrow(householdPaymentListQuerySchema, input);
    const filter: Record<string, unknown> = { societyId: context.societyId };
    if (query.flatId) filter.flatId = query.flatId;
    if (!context.user.permissions.includes('sama.view_society') && context.user.flatId) filter.flatId = context.user.flatId;
    const { page, limit, skip } = parsePagination(query);
    const [items, total] = await Promise.all([
      HouseholdRateCard.find(filter).sort({ effectiveFrom: -1 }).skip(skip).limit(limit),
      HouseholdRateCard.countDocuments(filter),
    ]);
    return buildPaginatedResult(items, total, page, limit);
  }

  async create(context: SamaActorContext, input: unknown) {
    const dto = parseOrThrow(householdRateCardCreateSchema, input);
    const association = await HouseholdAssociation.findOne({ _id: dto.associationId, societyId: context.societyId }).orFail();
    return HouseholdRateCard.create({
      societyId: context.societyId,
      associationId: association._id,
      staffProfileId: association.staffProfileId,
      flatId: association.flatId,
      residentId: association.residentId,
      monthlyRatePaise: dto.monthlyRatePaise,
      overtimeRatePaise: dto.overtimeRatePaise,
      effectiveFrom: dto.effectiveFrom,
      effectiveTo: dto.effectiveTo,
      notes: dto.notes,
      createdBy: context.user.userId,
      updatedBy: context.user.userId,
    });
  }

  async update(context: SamaActorContext, rateCardId: string, input: unknown) {
    const dto = parseOrThrow(householdRateCardUpdateSchema, input);
    return HouseholdRateCard.findOneAndUpdate(
      { _id: rateCardId, societyId: context.societyId },
      { $set: { ...dto, updatedBy: context.user.userId } },
      { new: true }
    ).orFail();
  }
}

export const householdRateCardService = new HouseholdRateCardService();
