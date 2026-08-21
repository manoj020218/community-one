import { NotFoundError, ValidationError } from '../../common/errors/AppError';
import { McrActorContext } from './mcr.access.service';
import { BillingPlan, IBillingPlanDocument } from './billingPlan.model';
import { billingPlanCreateSchema, billingPlanUpdateSchema } from './billingPlan.schemas';
import { chargeHeadService } from './chargeHead.service';
import { parseOrThrow } from './mcr.validation';

export class BillingPlanService {
  async listBySociety(societyId: string): Promise<IBillingPlanDocument[]> {
    return BillingPlan.find({ societyId }).sort({ effectiveFrom: -1, name: 1 });
  }

  async create(context: McrActorContext, input: unknown): Promise<IBillingPlanDocument> {
    const dto = parseOrThrow(billingPlanCreateSchema, input);
    const uniqueChargeHeadIds = [...new Set(dto.chargeLines.map((line) => line.chargeHeadId))];
    const matchingHeads = await chargeHeadService.countByIds(context.societyId, uniqueChargeHeadIds);

    if (matchingHeads !== uniqueChargeHeadIds.length) {
      throw new ValidationError('One or more charge heads do not belong to this society');
    }

    const existing = await BillingPlan.findOne({ societyId: context.societyId, name: dto.name });
    if (existing) {
      throw new ValidationError('Billing plan with this name already exists');
    }

    const created = await BillingPlan.create({
      societyId: context.societyId,
      ...dto,
      createdBy: context.user.userId,
      updatedBy: context.user.userId,
    });

    if (!created) throw new NotFoundError('BillingPlan');
    return created;
  }

  async update(context: McrActorContext, id: string, input: unknown): Promise<IBillingPlanDocument> {
    const dto = parseOrThrow(billingPlanUpdateSchema, input);

    if (dto.chargeLines) {
      const uniqueChargeHeadIds = [...new Set(dto.chargeLines.map((line) => line.chargeHeadId))];
      const matchingHeads = await chargeHeadService.countByIds(context.societyId, uniqueChargeHeadIds);
      if (matchingHeads !== uniqueChargeHeadIds.length) {
        throw new ValidationError('One or more charge heads do not belong to this society');
      }
    }

    if (dto.name) {
      const existing = await BillingPlan.findOne({ societyId: context.societyId, name: dto.name, _id: { $ne: id } });
      if (existing) throw new ValidationError('Billing plan with this name already exists');
    }

    const updated = await BillingPlan.findOneAndUpdate(
      { _id: id, societyId: context.societyId },
      { ...dto, updatedBy: context.user.userId, $inc: { version: 1 } },
      { new: true }
    );
    if (!updated) throw new NotFoundError('BillingPlan');
    return updated;
  }
}

export const billingPlanService = new BillingPlanService();
