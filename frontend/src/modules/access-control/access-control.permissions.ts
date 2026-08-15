export const ACCESS_CONTROL_ROUTE_PERMISSIONS = [
  'access.zone.manage',
  'access.credential.manage',
  'access.policy.manage',
  'access.event.view',
] as const;

export function hasAccessControlAccess(permissions: string[] = []): boolean {
  return ACCESS_CONTROL_ROUTE_PERMISSIONS.some((permission) => permissions.includes(permission));
}
