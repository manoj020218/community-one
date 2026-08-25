import { MODULE_CODES, PERMISSIONS } from '../../config/constants';

export const PATROL_ROUTE_PERMISSIONS = [
  PERMISSIONS.PATROL_CONFIGURE,
  PERMISSIONS.PATROL_CHECKPOINT_MANAGE,
  PERMISSIONS.PATROL_ROUTE_MANAGE,
  PERMISSIONS.PATROL_ASSIGNMENT_MANAGE,
  PERMISSIONS.PATROL_EXECUTE,
  PERMISSIONS.PATROL_VIEW_ALL,
  PERMISSIONS.PATROL_VIEW_OWN,
  PERMISSIONS.PATROL_VIEW_REPORTS,
] as const;

export const GUARD_PATROL_MANIFEST = {
  code: MODULE_CODES.GUARD_PATROL,
  name: 'Guard Patrolling',
  description: 'QR/NFC checkpoint patrol rounds with GPS-verified guard tracking and Hit/Miss reporting',
  version: '1.0.0',
  status: 'ACTIVE',
  icon: 'Footprints',
  routePrefix: '/guard-patrol',
  apiPrefix: '/api/guard-patrol',
  requiredPlan: ['BASIC', 'STANDARD', 'PREMIUM', 'ENTERPRISE'],
  defaultEnabled: false,
  permissions: [
    PERMISSIONS.PATROL_CONFIGURE,
    PERMISSIONS.PATROL_CHECKPOINT_MANAGE,
    PERMISSIONS.PATROL_ROUTE_MANAGE,
    PERMISSIONS.PATROL_ASSIGNMENT_MANAGE,
    PERMISSIONS.PATROL_EXECUTE,
    PERMISSIONS.PATROL_VIEW_ALL,
    PERMISSIONS.PATROL_VIEW_OWN,
    PERMISSIONS.PATROL_VIEW_REPORTS,
  ],
  settingsSchema: {
    defaultAlertThresholdMinutes: { type: 'number', default: 5 },
    defaultAlertSoundKey: { type: 'string', default: 'chime' },
  },
} as const;
