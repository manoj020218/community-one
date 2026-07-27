export const SAMA_ROUTE_PERMISSIONS = [
  'sama.view_self',
  'sama.view_society',
  'sama.view_staff',
  'sama.configure',
  'sama.sync',
] as const;

export function hasSamaAccess(permissions: string[] = []): boolean {
  return SAMA_ROUTE_PERMISSIONS.some((permission) => permissions.includes(permission));
}

export function hasSamaAdminAccess(permissions: string[] = []): boolean {
  return ['sama.view_society', 'sama.view_staff', 'sama.configure', 'sama.sync']
    .some((permission) => permissions.includes(permission));
}

export function hasSamaResidentAccess(permissions: string[] = []): boolean {
  return permissions.includes('sama.view_self');
}

export function hasSamaStaffAccess(permissions: string[] = []): boolean {
  return ['sama.view_staff', 'sama.create_staff', 'sama.edit_staff'].some((permission) => permissions.includes(permission));
}

export function hasSamaCategoryAccess(permissions: string[] = []): boolean {
  return ['sama.view_staff', 'sama.manage_staff_categories'].some((permission) => permissions.includes(permission));
}

export function hasSamaHouseholdAdminAccess(permissions: string[] = []): boolean {
  return ['sama.manage_household_associations', 'sama.manage_household_payments'].some((permission) => permissions.includes(permission));
}

export function hasSamaProviderAccess(permissions: string[] = []): boolean {
  return ['sama.view_society', 'sama.view_staff', 'sama.manage_service_pool'].some((permission) => permissions.includes(permission));
}

export function hasSamaWorkOrderAccess(permissions: string[] = []): boolean {
  return ['sama.view_society', 'sama.manage_service_pool', 'sama.create_work_order', 'sama.assign_work_order', 'sama.complete_work_order']
    .some((permission) => permissions.includes(permission));
}

export function hasSamaAccessControlAccess(permissions: string[] = []): boolean {
  return ['sama.manage_access', 'sama.manage_credentials'].some((permission) => permissions.includes(permission));
}

export function hasSamaBridgeAccess(permissions: string[] = []): boolean {
  return ['sama.configure', 'sama.sync'].some((permission) => permissions.includes(permission));
}

export function hasSamaReportsAccess(permissions: string[] = []): boolean {
  return ['sama.view_reports', 'sama.export_reports'].some((permission) => permissions.includes(permission));
}
