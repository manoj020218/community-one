import { z } from 'zod';

export const VISITOR_STATUSES = {
  DRAFT: 'DRAFT',
  PENDING_APPROVAL: 'PENDING_APPROVAL',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  EXPIRED: 'EXPIRED',
  CANCELLED: 'CANCELLED',
  ENTRY_CONFIRMED: 'ENTRY_CONFIRMED',
  EXIT_CONFIRMED: 'EXIT_CONFIRMED',
  CLOSED: 'CLOSED',
} as const;

export type VisitorRequestStatus = typeof VISITOR_STATUSES[keyof typeof VISITOR_STATUSES];

export const VISITOR_TERMINAL_STATUSES: VisitorRequestStatus[] = [
  VISITOR_STATUSES.REJECTED,
  VISITOR_STATUSES.EXPIRED,
  VISITOR_STATUSES.CANCELLED,
  VISITOR_STATUSES.EXIT_CONFIRMED,
  VISITOR_STATUSES.CLOSED,
];

export const VISITOR_STATE_TRANSITIONS: Record<VisitorRequestStatus, VisitorRequestStatus[]> = {
  DRAFT: [VISITOR_STATUSES.PENDING_APPROVAL, VISITOR_STATUSES.CANCELLED],
  PENDING_APPROVAL: [VISITOR_STATUSES.APPROVED, VISITOR_STATUSES.REJECTED, VISITOR_STATUSES.EXPIRED, VISITOR_STATUSES.CANCELLED],
  APPROVED: [VISITOR_STATUSES.ENTRY_CONFIRMED, VISITOR_STATUSES.CANCELLED],
  REJECTED: [],
  EXPIRED: [],
  CANCELLED: [],
  ENTRY_CONFIRMED: [VISITOR_STATUSES.EXIT_CONFIRMED, VISITOR_STATUSES.CLOSED],
  EXIT_CONFIRMED: [VISITOR_STATUSES.CLOSED],
  CLOSED: [],
};

export function canTransition(from: VisitorRequestStatus, to: VisitorRequestStatus): boolean {
  return VISITOR_STATE_TRANSITIONS[from]?.includes(to) || false;
}

export const visitorSettingsSchema = z.object({
  defaultApprovalExpiryMinutes: z.number().int().min(1).max(1440).default(5),
  requireVisitorPhoto: z.boolean().default(true),
  requireVisitorMobile: z.boolean().default(true),
  requirePurpose: z.boolean().default(false),
  allowGuardCancellation: z.boolean().default(true),
  requireRejectionReason: z.boolean().default(false),
  entryConfirmationRequired: z.boolean().default(true),
  exitConfirmationEnabled: z.boolean().default(true),
  visitorDataRetentionDays: z.number().int().min(1).max(3650).default(90),
  allowedGateIds: z.array(z.string()).default([]),
  realtimePollingFallbackIntervalMs: z.number().int().min(5000).max(60000).default(15000),
  phase2VideoCallEnabled: z.boolean().default(false),
  guardStatusDisplaySeconds: z.number().int().min(0).max(3600).default(60),
  duplicateWindowSeconds: z.number().int().min(0).max(300).default(30),
  maxPendingRequestsPerFlat: z.number().int().min(1).max(20).default(3),
  maxRequestsPerMobilePerHour: z.number().int().min(1).max(100).default(10),
});

export const visitorSettingsUpdateSchema = visitorSettingsSchema.partial();
export type VisitorSettings = z.infer<typeof visitorSettingsSchema>;

export function parseVisitorSettings(input?: Record<string, unknown>): VisitorSettings {
  return visitorSettingsSchema.parse(input || {});
}

export function normalizeVisitorMobile(value: string): string {
  return value.replace(/[^\d+]/g, '');
}

export function isValidVisitorMobile(value: string): boolean {
  return /^\+?\d{7,15}$/.test(normalizeVisitorMobile(value));
}

/** Keeps the last 4 digits visible, masks the rest (e.g. "******7890"). */
export function maskMobile(value: string): string {
  const digits = value.replace(/\D/g, '');
  if (digits.length <= 4) return '*'.repeat(digits.length);
  return '*'.repeat(digits.length - 4) + digits.slice(-4);
}
