import { ChargeHead, IChargeHeadDocument } from './chargeHead.model';
import { McrActorContext } from './mcr.access.service';
import { chargeHeadCreateSchema } from './chargeHead.schemas';
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

  async countByIds(societyId: string, ids: string[]): Promise<number> {
    return ChargeHead.countDocuments({ societyId, _id: { $in: ids } });
  }
}

export const chargeHeadService = new ChargeHeadService();
