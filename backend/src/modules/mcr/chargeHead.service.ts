import { NotFoundError } from '../../common/errors/AppError';
import { ChargeHead, IChargeHeadDocument } from './chargeHead.model';
import { McrActorContext } from './mcr.access.service';
import { chargeHeadCreateSchema, chargeHeadUpdateSchema } from './chargeHead.schemas';
import { parseOrThrow } from './mcr.validation';

export class ChargeHeadService {
  async listBySociety(societyId: string): Promise<IChargeHeadDocument[]> {
    return ChargeHead.find({ societyId }).sort({ displayOrder: 1, name: 1 });
  }

  async create(context: McrActorContext, input: unknown): Promise<IChargeHeadDocument> {
    const dto = parseOrThrow(chargeHeadCreateSchema, input);
    return ChargeHead.create({
      societyId: context.societyId,
      ...dto,
      createdBy: context.user.userId,
      updatedBy: context.user.userId,
    });
  }

  async update(context: McrActorContext, id: string, input: unknown): Promise<IChargeHeadDocument> {
    const dto = parseOrThrow(chargeHeadUpdateSchema, input);
    const updated = await ChargeHead.findOneAndUpdate(
      { _id: id, societyId: context.societyId },
      { ...dto, updatedBy: context.user.userId },
      { new: true }
    );
    if (!updated) throw new NotFoundError('ChargeHead');
    return updated;
  }

  async countByIds(societyId: string, ids: string[]): Promise<number> {
    return ChargeHead.countDocuments({ societyId, _id: { $in: ids } });
  }
}

export const chargeHeadService = new ChargeHeadService();
