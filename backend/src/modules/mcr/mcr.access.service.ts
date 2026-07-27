import { AppError } from '../../common/errors/AppError';
import { JwtPayload } from '../../common/types';
import { resolveActorSocietyId } from '../../common/utils/authScope';
import { MODULE_CODES } from '../../config/constants';
import { moduleRegistryService } from '../moduleRegistry/moduleRegistry.service';

export interface McrActorContext {
  user: JwtPayload;
  societyId: string;
}

export class McrAccessService {
  async getActorContext(user: JwtPayload, explicitSocietyId?: string): Promise<McrActorContext> {
    const societyId = resolveActorSocietyId(user, explicitSocietyId);
    await this.ensureModuleEnabled(societyId);
    return { user, societyId };
  }

  async ensureModuleEnabled(societyId: string): Promise<void> {
    const enabled = await moduleRegistryService.isModuleEnabled(societyId, MODULE_CODES.MCR);
    if (!enabled) {
      throw new AppError(
        'Maintenance & Receipts is not enabled for this society',
        403,
        'MCR_MODULE_NOT_ENABLED',
        { societyId, moduleCode: MODULE_CODES.MCR }
      );
    }
  }
}

export const mcrAccessService = new McrAccessService();
