import { AuthorizationError } from '../../common/errors/AppError';
import { JwtPayload } from '../../common/types';
import { resolveActorSocietyId } from '../../common/utils/authScope';
import { PERMISSIONS } from '../../config/constants';
import { moduleRegistryService } from '../moduleRegistry/moduleRegistry.service';
import { guardAssignmentService } from '../guardAssignment/guardAssignment.service';
import { visitorSettingsService } from './visitor.settings.service';

export interface VisitorActorContext {
  user: JwtPayload;
  societyId: string;
  flatId?: string;
  gateIds: string[];
  permissions: string[];
  canViewSociety: boolean;
  canOverride: boolean;
}

export class VisitorAccessService {
  async getActorContext(user: JwtPayload, explicitSocietyId?: string): Promise<VisitorActorContext> {
    const societyId = resolveActorSocietyId(user, explicitSocietyId);
    await visitorSettingsService.ensureModuleEnabled(societyId);
    const gateIds = user.permissions.includes(PERMISSIONS.VISITOR_REQUEST_VIEW_ASSIGNED_GATE)
      ? await guardAssignmentService.getActiveGateIdsForUser(societyId, user.userId)
      : [];

    return {
      user,
      societyId,
      flatId: user.flatId,
      gateIds,
      permissions: user.permissions,
      canViewSociety: user.permissions.includes(PERMISSIONS.VISITOR_REQUEST_VIEW_SOCIETY),
      canOverride: user.permissions.includes(PERMISSIONS.VISITOR_REQUEST_OVERRIDE),
    };
  }

  async getEnabledModuleCodes(societyId: string): Promise<string[]> {
    const modules = await moduleRegistryService.getSocietyModules(societyId);
    return modules.filter((item) => item.isEnabled).map((item) => item.code);
  }

  /** Returns true if access was granted by bypassing normal ownership (society-wide/override scope) — callers should audit this. */
  assertGateAccess(context: VisitorActorContext, gateId: string): boolean {
    if (context.canViewSociety || context.canOverride) return true;
    if (!context.gateIds.includes(gateId)) throw new AuthorizationError('Access denied to this gate');
    return false;
  }

  /** Returns true if access was granted by bypassing normal ownership (society-wide/override scope) — callers should audit this. */
  assertFlatAccess(context: VisitorActorContext, flatId: string): boolean {
    if (context.canViewSociety || context.canOverride) return true;
    if (context.flatId !== flatId) throw new AuthorizationError('Access denied to this flat');
    return false;
  }
}

export const visitorAccessService = new VisitorAccessService();
