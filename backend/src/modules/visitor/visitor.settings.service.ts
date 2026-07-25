import { AuthorizationError, ValidationError } from '../../common/errors/AppError';
import { MODULE_CODES } from '../../config/constants';
import { auditService } from '../audit/audit.service';
import { SocietyModuleConfig } from '../moduleRegistry/moduleRegistry.model';
import { moduleRegistryService } from '../moduleRegistry/moduleRegistry.service';
import { gateService } from '../gate/gate.service';
import { parseVisitorSettings, visitorSettingsUpdateSchema, VisitorSettings } from './visitor.constants';
import type { VisitorActorContext } from './visitor.access.service';

export class VisitorSettingsService {
  async getSettings(societyId: string): Promise<VisitorSettings> {
    const config = await SocietyModuleConfig.findOne({ societyId, moduleCode: MODULE_CODES.VISITOR });
    return parseVisitorSettings(config?.settings as Record<string, unknown> | undefined);
  }

  async updateSettings(context: VisitorActorContext, input: Record<string, unknown>): Promise<VisitorSettings> {
    const current = await this.getSettings(context.societyId);
    const next = visitorSettingsUpdateSchema.parse(input);
    const merged = parseVisitorSettings({ ...current, ...next });
    if (merged.allowedGateIds.length) {
      const gates = await gateService.getByIds(context.societyId, merged.allowedGateIds);
      if (gates.length !== merged.allowedGateIds.length) {
        throw new ValidationError('One or more allowed gates do not belong to this society');
      }
    }

    await SocietyModuleConfig.findOneAndUpdate(
      { societyId: context.societyId, moduleCode: MODULE_CODES.VISITOR },
      { $set: { settings: merged, enabledBy: context.user.userId }, $setOnInsert: { isEnabled: false } },
      { upsert: true, new: true }
    );
    await auditService.log({
      societyId: context.societyId,
      actorUserId: context.user.userId,
      actorRole: context.user.roleCode,
      moduleCode: 'VISITOR',
      action: 'VISITOR_SETTINGS_CHANGED',
      entityType: 'VisitorSettings',
      entityId: context.societyId,
      oldValue: current,
      newValue: next,
      ipAddress: '',
    });
    return merged;
  }

  async ensureModuleEnabled(societyId: string): Promise<void> {
    const enabled = await moduleRegistryService.isModuleEnabled(societyId, MODULE_CODES.VISITOR);
    if (!enabled) throw new AuthorizationError('Visitor Management module is disabled for this society');
  }
}

export const visitorSettingsService = new VisitorSettingsService();
