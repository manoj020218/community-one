export const MCR_ROUTE_PERMISSIONS = [
  'mcr.view_self',
  'mcr.view_flat',
  'mcr.view_all',
  'mcr.configure',
  'mcr.view_reports',
] as const;

export function hasMcrAccess(permissions: string[] = []): boolean {
  return MCR_ROUTE_PERMISSIONS.some((permission) => permissions.includes(permission));
}

export function hasMcrAdminAccess(permissions: string[] = []): boolean {
  return ['mcr.view_flat', 'mcr.view_all', 'mcr.configure', 'mcr.view_reports']
    .some((permission) => permissions.includes(permission));
}

export function hasMcrResidentAccess(permissions: string[] = []): boolean {
  return ['mcr.view_self', 'mcr.view_flat'].some((permission) => permissions.includes(permission));
}

export function hasMcrConfigureAccess(permissions: string[] = []): boolean {
  return permissions.includes('mcr.configure');
}

export function hasMcrDemandAccess(permissions: string[] = []): boolean {
  return ['mcr.view_all', 'mcr.generate_demand', 'mcr.publish_demand'].some((permission) => permissions.includes(permission));
}

export function hasMcrPaymentAccess(permissions: string[] = []): boolean {
  return ['mcr.view_all', 'mcr.record_payment', 'mcr.verify_payment'].some((permission) => permissions.includes(permission));
}

export function hasMcrVerifyAccess(permissions: string[] = []): boolean {
  return permissions.includes('mcr.verify_payment');
}

export function hasMcrReceiptAccess(permissions: string[] = []): boolean {
  return ['mcr.view_all', 'mcr.generate_receipt', 'mcr.record_payment', 'mcr.verify_payment'].some((permission) => permissions.includes(permission));
}

export function hasMcrReportsAccess(permissions: string[] = []): boolean {
  return ['mcr.view_reports', 'mcr.view_all', 'mcr.configure', 'mcr.export_reports'].some((permission) => permissions.includes(permission));
}

export function hasMcrGatewayAccess(permissions: string[] = []): boolean {
  return permissions.includes('mcr.manage_payment_gateway');
}

export function hasMcrExpenseAccess(permissions: string[] = []): boolean {
  return permissions.includes('mcr.manage_expense');
}

export function hasMcrOpeningBalanceAccess(permissions: string[] = []): boolean {
  return permissions.includes('mcr.manage_opening_balance');
}
