import { JwtPayload } from '../types';
import { AuthorizationError, ValidationError } from '../errors/AppError';

const SUPER_ROLES = new Set(['JENIX_SUPER_ADMIN', 'JENIX_SUPPORT']);

export function isSuperRole(roleCode: string): boolean {
  return SUPER_ROLES.has(roleCode);
}

export function resolveActorSocietyId(
  user: JwtPayload,
  ...candidates: Array<string | undefined | null>
): string {
  if (!isSuperRole(user.roleCode)) {
    if (!user.societyId) {
      throw new AuthorizationError('User is not bound to a society');
    }
    return user.societyId;
  }

  const selectedSocietyId = candidates.find((value) => typeof value === 'string' && value.trim());
  if (!selectedSocietyId) {
    throw new ValidationError('societyId is required for this action');
  }
  return selectedSocietyId;
}

export function assertSocietyAccess(user: JwtPayload, societyId: string): void {
  if (!isSuperRole(user.roleCode) && user.societyId !== societyId) {
    throw new AuthorizationError('Access denied to this society');
  }
}
