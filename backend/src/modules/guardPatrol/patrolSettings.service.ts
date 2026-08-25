import { PatrolSettings, IPatrolSettingsDocument } from './patrolSettings.model';

export class PatrolSettingsService {
  async getSettings(societyId: string): Promise<IPatrolSettingsDocument> {
    let settings = await PatrolSettings.findOne({ societyId });
    if (!settings) settings = await PatrolSettings.create({ societyId });
    return settings;
  }

  async updateSettings(societyId: string, dto: Partial<Pick<IPatrolSettingsDocument, 'defaultAlertThresholdMinutes' | 'defaultAlertSoundKey'>>): Promise<IPatrolSettingsDocument> {
    return PatrolSettings.findOneAndUpdate({ societyId }, dto, { new: true, upsert: true });
  }
}

export const patrolSettingsService = new PatrolSettingsService();
