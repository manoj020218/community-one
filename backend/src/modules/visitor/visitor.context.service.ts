import { VisitorActorContext, visitorAccessService } from './visitor.access.service';
import { visitorSettingsService } from './visitor.settings.service';

export interface AppContextOption {
  societyId: string;
  roleCode: string;
  flatId?: string;
  gateIds?: string[];
}

export class VisitorContextService {
  async getContext(user: VisitorActorContext): Promise<{
    activeContext: AppContextOption;
    availableContexts: AppContextOption[];
    permissions: string[];
    enabledModules: string[];
    featureFlags: Record<string, boolean>;
  }> {
    const [enabledModules, settings] = await Promise.all([
      visitorAccessService.getEnabledModuleCodes(user.societyId),
      visitorSettingsService.getSettings(user.societyId),
    ]);

    const activeContext = {
      societyId: user.societyId,
      roleCode: user.user.roleCode,
      flatId: user.flatId,
      gateIds: user.gateIds,
    };

    return {
      activeContext,
      availableContexts: [activeContext],
      permissions: user.permissions,
      enabledModules,
      featureFlags: {
        visitorPhase2VideoCall: settings.phase2VideoCallEnabled,
        visitorSseEnabled: true,
      },
    };
  }
}

export const visitorContextService = new VisitorContextService();
