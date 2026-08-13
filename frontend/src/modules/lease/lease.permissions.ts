export const LEASE_ROUTE_PERMISSIONS = [
  'lease.read',
  'lease.create',
  'lease.update',
  'lease.terminate',
  'lease.renew',
] as const;

export function hasLeaseAccess(permissions: string[] = []): boolean {
  return LEASE_ROUTE_PERMISSIONS.some((permission) => permissions.includes(permission));
}

export function hasLeaseManageAccess(permissions: string[] = []): boolean {
  return ['lease.create', 'lease.update', 'lease.terminate', 'lease.renew'].some((permission) => permissions.includes(permission));
}
