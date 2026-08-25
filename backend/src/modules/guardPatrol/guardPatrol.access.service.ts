import { AppError } from '../../common/errors/AppError';
import { JwtPayload } from '../../common/types';
import { resolveActorSocietyId } from '../../common/utils/authScope';
import { MODULE_CODES } from '../../config/constants';
import { moduleRegistryService } from '../moduleRegistry/moduleRegistry.service';

export interface PatrolActorContext {
  user: JwtPayload;
  societyId: string;
}

export class GuardPatrolAccessService {
  async getActorContext(user: JwtPayload, explicitSocietyId?: string): Promise<PatrolActorContext> {
    const societyId = resolveActorSocietyId(user, explicitSocietyId);
    await this.ensureModuleEnabled(societyId);
    return { user, societyId };
  }

  async ensureModuleEnabled(societyId: string): Promise<void> {
    const enabled = await moduleRegistryService.isModuleEnabled(societyId, MODULE_CODES.GUARD_PATROL);
    if (!enabled) {
      throw new AppError(
        'Guard Patrolling is not enabled for this society',
        403,
        'GUARD_PATROL_MODULE_NOT_ENABLED',
        { societyId, moduleCode: MODULE_CODES.GUARD_PATROL }
      );
    }
  }
}

export const guardPatrolAccessService = new GuardPatrolAccessService();
