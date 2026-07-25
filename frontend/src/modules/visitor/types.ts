export interface VisitorContext {
  activeContext: {
    societyId: string;
    roleCode: string;
    flatId?: string;
    gateIds?: string[];
  };
  // Note: the platform's session model carries one societyId/flatId per JWT, so
  // this is always a single-item array today — true multi-context switching
  // would need a core auth change beyond this module. Not surfaced in the UI.
  permissions: string[];
  enabledModules: string[];
  featureFlags: Record<string, boolean>;
}

export interface VisitorGate {
  _id: string;
  name: string;
  code: string;
  entryType: string;
}

export interface VisitorFlatTile {
  _id: string;
  flatNo: string;
  activeRequest?: {
    requestId: string;
    status: string;
    statusChangedAt: string;
    gateId: string;
  } | null;
}

export interface VisitorRequest {
  _id: string;
  status: string;
  statusChangedAt: string;
  visitorName: string;
  visitorMobile?: string;
  purpose?: string;
  rejectionReason?: string;
  approvalNote?: string;
  createdAt: string;
  expiresAt?: string;
  decisionAt?: string;
  decisionByUserId?: { name: string; roleCode: string } | string;
  gateId: VisitorGate | string;
  flatId: { _id: string; flatNo: string } | string;
  towerId: { _id: string; name: string; code: string } | string;
  visitorPhotoFileId?: { originalName: string } | string;
}

export interface VisitorSettings {
  defaultApprovalExpiryMinutes: number;
  requireVisitorPhoto: boolean;
  requireVisitorMobile: boolean;
  requirePurpose: boolean;
  allowGuardCancellation: boolean;
  requireRejectionReason: boolean;
  entryConfirmationRequired: boolean;
  exitConfirmationMode: 'AUTO' | 'GUARD' | 'RESIDENT';
  autoExpiryEnabled: boolean;
  visitorDataRetentionDays: number;
  allowedGateIds: string[];
  realtimePollingFallbackIntervalMs: number;
  phase2VideoCallEnabled: boolean;
  guardStatusDisplaySeconds: number;
  duplicateWindowSeconds: number;
  maxPendingRequestsPerFlat: number;
  maxRequestsPerMobilePerHour: number;
}

export interface VisitorGateActivity {
  gateId: string;
  gateName: string;
  count: number;
}

export interface VisitorSummary extends Record<string, number | VisitorGateActivity[]> {
  CURRENTLY_INSIDE: number;
  TODAY_COUNT: number;
  AVG_APPROVAL_MINUTES: number;
  BY_GATE: VisitorGateActivity[];
}
