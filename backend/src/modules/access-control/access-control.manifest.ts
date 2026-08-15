import { MODULE_CODES, PERMISSIONS } from '../../config/constants';

export const ACCESS_CONTROL_ROUTE_PERMISSIONS = [
  PERMISSIONS.ACCESS_ZONE_MANAGE,
  PERMISSIONS.ACCESS_CREDENTIAL_MANAGE,
  PERMISSIONS.ACCESS_POLICY_MANAGE,
  PERMISSIONS.ACCESS_EVENT_VIEW,
] as const;

export const ACCESS_CONTROL_MANIFEST = {
  code: MODULE_CODES.ACCESS_CONTROL,
  name: 'Member Access Control',
  description: 'Gym, spa, pool and gate access management — zones, resident policies and device-linked access history',
  version: '1.0.0',
  status: 'ACTIVE',
  icon: 'KeyRound',
  routePrefix: '/access',
  apiPrefix: '/api/access',
  requiredPlan: ['PREMIUM', 'ENTERPRISE'],
  defaultEnabled: false,
  permissions: [
    PERMISSIONS.ACCESS_ZONE_MANAGE,
    PERMISSIONS.ACCESS_CREDENTIAL_MANAGE,
    PERMISSIONS.ACCESS_POLICY_MANAGE,
    PERMISSIONS.ACCESS_EVENT_VIEW,
    PERMISSIONS.ACCESS_EVENT_RESOLVE,
    PERMISSIONS.ACCESS_SYNC,
  ],
  settingsSchema: {
    defaultAccessMode: { type: 'string', default: 'ALWAYS' },
  },
} as const;
