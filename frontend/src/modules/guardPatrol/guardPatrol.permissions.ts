export const PATROL_ROUTE_PERMISSIONS = [
  'patrol.configure',
  'patrol.checkpoint.manage',
  'patrol.route.manage',
  'patrol.assignment.manage',
  'patrol.execute',
  'patrol.view_all',
  'patrol.view_own',
  'patrol.view_reports',
] as const;

export function hasPatrolAccess(permissions: string[] = []): boolean {
  return PATROL_ROUTE_PERMISSIONS.some((permission) => permissions.includes(permission));
}

export function hasPatrolAdminAccess(permissions: string[] = []): boolean {
  return ['patrol.configure', 'patrol.checkpoint.manage', 'patrol.route.manage', 'patrol.assignment.manage', 'patrol.view_all']
    .some((permission) => permissions.includes(permission));
}

export function hasPatrolExecuteAccess(permissions: string[] = []): boolean {
  return permissions.includes('patrol.execute');
}

export function hasPatrolReportsAccess(permissions: string[] = []): boolean {
  return ['patrol.view_all', 'patrol.view_reports'].some((permission) => permissions.includes(permission));
}
