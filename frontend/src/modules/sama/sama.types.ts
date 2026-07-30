export const SAMA_STAFF_TYPES = ['SOCIETY_EMPLOYEE', 'HOUSEHOLD_STAFF', 'SERVICE_POOL_WORKER', 'CONTRACTOR_EMPLOYEE', 'TEMPORARY_WORKER'] as const;
export const SAMA_ACCESS_STATUSES = ['ACTIVE', 'SUSPENDED', 'BLOCKED'] as const;
export const SAMA_VERIFICATION_STATUSES = ['PENDING', 'APPROVED', 'REJECTED'] as const;
export const SAMA_ENGAGEMENT_TYPES = ['SOCIETY_PAYROLL', 'HOUSEHOLD_DIRECT', 'SERVICE_POOL', 'CONTRACTOR', 'TEMPORARY'] as const;
export const SAMA_EMPLOYER_TYPES = ['SOCIETY', 'HOUSEHOLD', 'CONTRACTOR'] as const;
export const SAMA_PAYMENT_RESPONSIBILITIES = ['SOCIETY', 'HOUSEHOLD', 'CONTRACTOR'] as const;
export const SAMA_ASSOCIATION_STATUSES = ['PENDING_RESIDENT_APPROVAL', 'PENDING_SOCIETY_APPROVAL', 'ACTIVE', 'SUSPENDED', 'ENDED'] as const;
export const SAMA_PROVIDER_TYPES = ['INDIVIDUAL', 'COMPANY'] as const;
export const SAMA_PROVIDER_STATUSES = ['ACTIVE', 'SUSPENDED', 'INACTIVE'] as const;
export const SAMA_WORK_ORDER_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as const;
export const SAMA_WORK_ORDER_STATUSES = ['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'] as const;
export const SAMA_ASSIGNEE_TYPES = ['STAFF_PROFILE', 'SERVICE_PROVIDER'] as const;
export const SAMA_ACCESS_POLICY_SUBJECT_TYPES = ['STAFF_PROFILE', 'SERVICE_PROVIDER', 'WORK_ORDER'] as const;
export const SAMA_ACCESS_MODES = ['ALWAYS', 'SCHEDULED', 'ONE_TIME_WINDOW'] as const;
export const SAMA_DAYS_OF_WEEK = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'] as const;
export const SAMA_ACCESS_POLICY_STATUSES = ['ACTIVE', 'SUSPENDED', 'EXPIRED'] as const;
export const SAMA_CREDENTIAL_TYPES = ['PIN', 'QR', 'RFID', 'BIOMETRIC_REFERENCE', 'MOBILE_TOKEN'] as const;
export const SAMA_CREDENTIAL_STATUSES = ['ACTIVE', 'REVOKED', 'EXPIRED'] as const;
export const SAMA_HOUSEHOLD_PAYMENT_STATUSES = ['DUE', 'PARTIAL', 'PAID', 'WAIVED'] as const;
export const SAMA_EXTERNAL_DEVICE_TYPES = ['M68', 'U5'] as const;
export const SAMA_SYNC_TYPES = ['EMPLOYEES', 'ATTENDANCE', 'LEAVES', 'SHIFTS', 'PAYROLL', 'ACCESS_EVENTS'] as const;
export const SAMA_LIFECYCLE_STATUSES = ['ACTIVE', 'SUSPENDED', 'TERMINATED'] as const;
export const SAMA_EXCEPTION_STATUSES = ['MATCHED', 'UNMATCHED_DEVICE', 'UNKNOWN_EVENT', 'RESOLVED', 'IGNORED'] as const;

export type SamaStaffType = typeof SAMA_STAFF_TYPES[number];
export type SamaAccessStatus = typeof SAMA_ACCESS_STATUSES[number];
export type SamaVerificationStatus = typeof SAMA_VERIFICATION_STATUSES[number];
export type SamaEngagementType = typeof SAMA_ENGAGEMENT_TYPES[number];
export type SamaEmployerType = typeof SAMA_EMPLOYER_TYPES[number];
export type SamaAssociationStatus = typeof SAMA_ASSOCIATION_STATUSES[number];
export type SamaProviderType = typeof SAMA_PROVIDER_TYPES[number];
export type SamaProviderStatus = typeof SAMA_PROVIDER_STATUSES[number];
export type SamaWorkOrderPriority = typeof SAMA_WORK_ORDER_PRIORITIES[number];
export type SamaWorkOrderStatus = typeof SAMA_WORK_ORDER_STATUSES[number];
export type SamaAssigneeType = typeof SAMA_ASSIGNEE_TYPES[number];
export type SamaAccessPolicySubjectType = typeof SAMA_ACCESS_POLICY_SUBJECT_TYPES[number];
export type SamaAccessMode = typeof SAMA_ACCESS_MODES[number];
export type SamaAccessPolicyStatus = typeof SAMA_ACCESS_POLICY_STATUSES[number];
export type SamaCredentialType = typeof SAMA_CREDENTIAL_TYPES[number];
export type SamaCredentialStatus = typeof SAMA_CREDENTIAL_STATUSES[number];
export type SamaHouseholdPaymentStatus = typeof SAMA_HOUSEHOLD_PAYMENT_STATUSES[number];
export type SamaLifecycleStatus = typeof SAMA_LIFECYCLE_STATUSES[number];
export type SamaExceptionStatus = typeof SAMA_EXCEPTION_STATUSES[number];

export interface StaffProfile {
  _id: string;
  staffCode: string;
  firstName: string;
  lastName?: string;
  displayName: string;
  mobile: string;
  email?: string;
  staffType: SamaStaffType;
  primaryCategory?: string;
  accessStatus: SamaAccessStatus;
  verificationStatus: SamaVerificationStatus;
  lifecycleStatus: SamaLifecycleStatus;
  suspensionReason?: string;
  terminationReason?: string;
  linkedUserId?: string;
}

export interface GuardCredentials {
  staffId: string;
  username: string;
  tempPassword: string;
  generatedAt: string;
}

export interface StaffEngagement {
  _id: string;
  staffProfileId: string;
  engagementType: SamaEngagementType;
  employerType: SamaEmployerType;
  employerFlatId?: string;
  employerResidentId?: string;
  jobTitle?: string;
  startDate: string;
  endDate?: string;
  status: string;
  paymentResponsibility: string;
}

export interface HouseholdAssociation {
  _id: string;
  staffProfileId: string | { _id: string; displayName?: string };
  engagementId: string;
  flatId: string | { _id: string; flatNo?: string };
  residentId: string;
  services: string[];
  monthlyRatePaise?: number;
  status: SamaAssociationStatus;
  residentApprovedAt?: string;
  societyApprovedAt?: string;
}

export interface StaffCategory {
  _id: string;
  code: string;
  name: string;
  staffTypes: SamaStaffType[];
  description?: string;
  defaultMonthlyRatePaise?: number;
  requiresSocietyApproval: boolean;
  isActive: boolean;
}

export interface ServiceProviderProfile {
  _id: string;
  providerCode: string;
  displayName: string;
  providerType: SamaProviderType;
  contactPersonName?: string;
  mobile: string;
  email?: string;
  serviceCategories: string[];
  status: SamaProviderStatus;
  verificationStatus: SamaVerificationStatus;
}

export interface WorkOrder {
  _id: string;
  workOrderCode: string;
  title: string;
  description?: string;
  category: string;
  priority: SamaWorkOrderPriority;
  status: SamaWorkOrderStatus;
  sourceType: string;
  flatId?: string | { _id: string; flatNo?: string };
  assigneeType?: SamaAssigneeType;
  assignedStaffProfileId?: string;
  assignedServiceProviderId?: string;
  accessPolicyId?: string;
  scheduledStartAt?: string;
  scheduledEndAt?: string;
  slaTargetMinutes?: number;
  slaDueAt?: string;
  slaBreached?: boolean;
  assignedAt?: string;
  rescheduledAt?: string;
  rescheduleReason?: string;
  escalationLevel?: number;
  escalatedAt?: string;
  escalationReason?: string;
  completedAt?: string;
  completionNotes?: string;
  cancelledAt?: string;
  cancellationReason?: string;
  residentRating?: number;
  residentFeedback?: string;
}

export interface SamaAccessEvent {
  _id: string;
  externalEventId: string;
  externalDeviceType: 'M68' | 'U5';
  externalDeviceId: string;
  externalKind: string;
  eventType: 'UNREGISTERED_SIGHTING' | 'CREDENTIAL_SCAN' | 'CREDENTIAL_ENROLLMENT' | 'DEVICE_OPERATION' | 'UNKNOWN';
  deviceBindingId?: string;
  exceptionStatus: SamaExceptionStatus;
  exceptionReason?: string;
  resolvedAt?: string;
  resolutionNotes?: string;
  occurredAt: string;
}

export interface AccessPolicy {
  _id: string;
  name: string;
  subjectType: SamaAccessPolicySubjectType;
  subjectId: string;
  accessMode: SamaAccessMode;
  allowedGateIds: string[];
  allowedDeviceIds: string[];
  allowedDaysOfWeek: string[];
  dailyStartTime?: string;
  dailyEndTime?: string;
  validFrom?: string;
  validUntil?: string;
  status: SamaAccessPolicyStatus;
}

export interface AccessCredential {
  _id: string;
  subjectType: SamaAccessPolicySubjectType;
  subjectId: string;
  accessPolicyId?: string;
  credentialType: SamaCredentialType;
  credentialLabel?: string;
  identifierLast4: string;
  validUntil?: string;
  issuedAt: string;
  status: SamaCredentialStatus;
  revokedAt?: string;
}

export interface HouseholdRateCard {
  _id: string;
  associationId: string;
  staffProfileId: string;
  flatId: string | { _id: string; flatNo?: string };
  residentId: string;
  monthlyRatePaise: number;
  overtimeRatePaise?: number;
  effectiveFrom: string;
  effectiveTo?: string;
  notes?: string;
  isActive: boolean;
}

export interface HouseholdPaymentRecord {
  _id: string;
  associationId: string;
  rateCardId?: string;
  staffProfileId: string;
  flatId: string | { _id: string; flatNo?: string };
  residentId: string;
  billingMonth: string;
  duePaise: number;
  paidPaise: number;
  status: SamaHouseholdPaymentStatus;
  paymentMethod?: string;
  paidAt?: string;
  notes?: string;
  receiptRef?: string;
}

export interface SamaDeviceBinding {
  _id: string;
  externalDeviceType: 'M68' | 'U5';
  externalDeviceId: string;
  externalDeviceName?: string;
  jenixDeviceId: string;
  gateId?: string;
  isActive: boolean;
}

export interface SamaExternalDevice {
  externalDeviceType: 'M68' | 'U5';
  externalDeviceId: string;
  externalDeviceName: string;
  isBound: boolean;
  bindingId?: string;
  jenixDeviceId?: string;
  isActive: boolean | null;
}

export interface SamaSourceConfig {
  provider: 'EDGEFOLIO';
  configured: boolean;
  baseUrl?: string;
  apiPrefix?: string;
  isActive?: boolean;
  syncScheduleEnabled?: boolean;
  syncIntervalMinutes?: number;
  scheduledSyncTypes?: string[];
  hasAccessToken?: boolean;
  lastEmployeeSyncAt?: string;
  lastAttendanceSyncAt?: string;
  lastShiftSyncAt?: string;
  lastLeaveSyncAt?: string;
  lastPayrollSyncAt?: string;
  lastAccessEventSyncAt?: string;
  lastScheduledSyncAt?: string;
  lastSyncError?: string;
  syncRetryLimit?: number;
  staleAfterMinutes?: number;
  consecutiveSyncFailures?: number;
  lastSyncFailureAt?: string;
  lastSuccessfulSyncAt?: string;
}

export interface SamaSyncHealth {
  configured: boolean;
  provider: string;
  overallStatus: 'NOT_CONFIGURED' | 'OK' | 'ATTENTION';
  syncScheduleEnabled?: boolean;
  syncIntervalMinutes?: number;
  syncRetryLimit?: number;
  staleAfterMinutes?: number;
  consecutiveSyncFailures?: number;
  lastSyncError?: string;
  lastSyncFailureAt?: string | null;
  lastSuccessfulSyncAt?: string | null;
  staleSyncTypes?: string[];
  syncChecks?: Array<{ syncType: string; lastSyncedAt: string | null; ageMinutes: number | null; isStale: boolean }>;
}

export interface SamaSyncRun {
  _id: string;
  provider: string;
  syncType: string;
  status: 'RUNNING' | 'SUCCESS' | 'FAILED';
  triggerMode: 'MANUAL' | 'SCHEDULED';
  importedCount?: number;
  createdCount?: number;
  updatedCount?: number;
  errorMessage?: string;
  startedAt: string;
  completedAt?: string;
}

export interface SamaDashboard {
  staffCount: number;
  categoryCount: number;
  activeAssociationCount: number;
  providerCount: number;
  suspendedStaffCount: number;
  terminatedStaffCount: number;
  workOrders: Record<string, number>;
  slaBreachedCount: number;
  householdDuePaise: number;
  householdPaidPaise: number;
  householdOutstandingPaise: number;
  unresolvedAccessExceptionCount: number;
  syncOverallStatus: string;
  staleSyncTypes: string[];
}

export interface SamaStaffReport {
  statusBreakdown: Array<{ status: string; count: number }>;
  categoryBreakdown: Array<{ category: string; count: number }>;
}

export interface SamaProviderReport {
  providerCode: string;
  displayName: string;
  status: string;
  totalAssigned: number;
  completedCount: number;
  slaBreachedCount: number;
  averageRating: number | null;
}

export interface SamaHouseholdPaymentReport {
  items: HouseholdPaymentRecord[];
  totalDuePaise: number;
  totalPaidPaise: number;
  outstandingPaise: number;
}

export interface SamaWorkOrderReport {
  items: WorkOrder[];
  totalCount: number;
  escalatedCount: number;
  cancelledCount: number;
  slaBreachedCount: number;
}

export interface SamaAccessExceptionReport {
  items: SamaAccessEvent[];
  summary: Record<string, number>;
}

export interface SamaContext {
  moduleCode: string;
  societyId: string;
  enabled: boolean;
  permissions: string[];
  provider: string;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/** SAMA amounts are stored in paise (integers); kept local to this module rather than importing MCR's helper. */
export function formatPaise(paise: number | undefined | null, currency = 'INR'): string {
  const value = (paise || 0) / 100;
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency }).format(value);
}

export function downloadCsv(fileName: string, content: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export const ASSOCIATION_STATUS_BADGE: Record<SamaAssociationStatus, string> = {
  PENDING_RESIDENT_APPROVAL: 'badge-yellow',
  PENDING_SOCIETY_APPROVAL: 'badge-yellow',
  ACTIVE: 'badge-green',
  SUSPENDED: 'badge-red',
  ENDED: 'badge-gray',
};

export const WORK_ORDER_STATUS_BADGE: Record<SamaWorkOrderStatus, string> = {
  OPEN: 'badge-blue',
  ASSIGNED: 'badge-yellow',
  IN_PROGRESS: 'badge-yellow',
  COMPLETED: 'badge-green',
  CANCELLED: 'badge-gray',
};

export const HOUSEHOLD_PAYMENT_STATUS_BADGE: Record<SamaHouseholdPaymentStatus, string> = {
  DUE: 'badge-red',
  PARTIAL: 'badge-yellow',
  PAID: 'badge-green',
  WAIVED: 'badge-gray',
};

export const EXCEPTION_STATUS_BADGE: Record<SamaExceptionStatus, string> = {
  MATCHED: 'badge-green',
  UNMATCHED_DEVICE: 'badge-red',
  UNKNOWN_EVENT: 'badge-red',
  RESOLVED: 'badge-blue',
  IGNORED: 'badge-gray',
};

export const LIFECYCLE_STATUS_BADGE: Record<SamaLifecycleStatus, string> = {
  ACTIVE: 'badge-green',
  SUSPENDED: 'badge-yellow',
  TERMINATED: 'badge-red',
};
