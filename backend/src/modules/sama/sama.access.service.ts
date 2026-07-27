import { AppError } from '../../common/errors/AppError';
import { JwtPayload } from '../../common/types';
import { resolveActorSocietyId } from '../../common/utils/authScope';
import { MODULE_CODES } from '../../config/constants';
import { moduleRegistryService } from '../moduleRegistry/moduleRegistry.service';

export interface SamaActorContext {
  user: JwtPayload;
  societyId: string;
}

export class SamaAccessService {
  async getActorContext(user: JwtPayload, explicitSocietyId?: string): Promise<SamaActorContext> {
    const societyId = resolveActorSocietyId(user, explicitSocietyId);
    await this.ensureModuleEnabled(societyId);
    return { user, societyId };
  }

  async ensureModuleEnabled(societyId: string): Promise<void> {
    const enabled = await moduleRegistryService.isModuleEnabled(societyId, MODULE_CODES.SAMA);
    if (!enabled) {
      throw new AppError(
        'SAMA is not enabled for this society',
        403,
        'SAMA_MODULE_NOT_ENABLED',
        { societyId, moduleCode: MODULE_CODES.SAMA }
      );
    }
  }
}

export const samaAccessService = new SamaAccessService();
