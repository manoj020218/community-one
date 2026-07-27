import { McrActorContext } from './mcr.access.service';
import { McrSettings, IMcrSettingsDocument } from './mcrSettings.model';
import { buildDefaultMcrSettingsInput, mcrSettingsUpdateSchema } from './mcrSettings.schemas';
import { parseOrThrow } from './mcr.validation';

export class McrSettingsService {
  async getBySociety(societyId: string, actorUserId: string): Promise<IMcrSettingsDocument> {
    const current = await McrSettings.findOne({ societyId });
    if (current) return current;

    const defaults = buildDefaultMcrSettingsInput();
    return McrSettings.create({ societyId, ...defaults, updatedBy: actorUserId });
  }

  async update(context: McrActorContext, input: unknown): Promise<IMcrSettingsDocument> {
    const update = parseOrThrow(mcrSettingsUpdateSchema, input);
    const current = await this.getBySociety(context.societyId, context.user.userId);

    return McrSettings.findOneAndUpdate(
      { societyId: context.societyId },
      { $set: { ...update, updatedBy: context.user.userId } },
      { new: true }
    ).orFail();
  }
}

export const mcrSettingsService = new McrSettingsService();
