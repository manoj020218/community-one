import { AxiosInstance } from 'axios';

export const MCR_DEMAND_STATUSES =['DRAFT', 'PUBLISHED', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'CANCELLED', 'WRITTEN_OFF'] as const;
export const MCR_PAYMENT_METHODS = ['CASH', 'CHEQUE', 'UPI', 'BANK_TRANSFER', 'CARD_OFFLINE', 'PAYMENT_GATEWAY', 'OTHER'] as const;
export const MCR_PAYMENT_STATUSES = ['DRAFT', 'PENDING_VERIFICATION', 'VERIFIED', 'REJECTED', 'BOUNCED', 'CANCELLED', 'REFUNDED', 'PARTIALLY_REFUNDED'] as const;
export const MCR_RECEIPT_STATUSES = ['ISSUED', 'VOID', 'REPLACED'] as const;
export const MCR_CHARGE_HEAD_CATEGORIES = ['MAINTENANCE', 'SINKING_FUND', 'REPAIR_FUND', 'WATER', 'PARKING', 'PENALTY', 'INTEREST', 'OTHER'] as const;
export const MCR_CALCULATION_METHODS = ['FIXED_FLAT', 'FIXED_FLAT_TYPE', 'AREA_BASED', 'CUSTOM'] as const;
export const MCR_BILLING_FREQUENCIES = ['MONTHLY', 'QUARTERLY', 'HALF_YEARLY', 'YEARLY', 'ONE_TIME'] as const;
export const MCR_NOTIFICATION_CHANNELS = ['IN_APP', 'PUSH', 'WHATSAPP', 'EMAIL', 'SMS'] as const;

export type McrDemandStatus = typeof MCR_DEMAND_STATUSES[number];
export type McrPaymentMethod = typeof MCR_PAYMENT_METHODS[number];
export type McrPaymentStatus = typeof MCR_PAYMENT_STATUSES[number];
export type McrReceiptStatus = typeof MCR_RECEIPT_STATUSES[number];
export type McrChargeHeadCategory = typeof MCR_CHARGE_HEAD_CATEGORIES[number];
export type McrCalculationMethod = typeof MCR_CALCULATION_METHODS[number];
export type McrBillingFrequency = typeof MCR_BILLING_FREQUENCIES[number];
export type McrNotificationChannel = typeof MCR_NOTIFICATION_CHANNELS[number];

export interface McrSettings {
  financialYearStartMonth: number;
  defaultCurrency: string;
  societyTimezone: string;
  receiptPrefix: string;
  demandNumberPrefix: string;
  defaultDueDays: number;
  gracePeriodDays: number;
  lateFeeEnabled: boolean;
  lateFeeAmountPaise: number;
  lateFeeIntervalDays: number;
  makerCheckerEnabled: boolean;
  allowSelfVerification: boolean;
  allowAdvancePayment: boolean;
  allowPartialPayment: boolean;
  allowResidentPaymentSubmission: boolean;
  publicReceiptVerificationEnabled: boolean;
  collectionUpiId: string;
  collectionUpiPayeeName: string;
  reminderAutomationEnabled: boolean;
  reminderFrequencyDays: number;
  reminderTimeOfDay: string;
}

export interface McrUpiQr {
  configured: boolean;
  upiId?: string;
  payeeName?: string;
  upiLink?: string;
  qrDataUrl?: string;
}

export interface ChargeHead {
  _id: string;
  code: string;
  name: string;
  description?: string;
  category: McrChargeHeadCategory;
  isRecurring: boolean;
  defaultAmountPaise: number;
  calculationMethod: McrCalculationMethod;
  isActive: boolean;
  displayOrder: number;
  effectiveFrom?: string;
  effectiveTo?: string;
}

export interface BillingPlanChargeLine {
  chargeHeadId: string;
  amountPaise: number;
  calculationMethod: McrCalculationMethod;
}

export interface BillingPlan {
  _id: string;
  name: string;
  frequency: McrBillingFrequency;
  billingDay: number;
  dueDay: number;
  chargeLines: BillingPlanChargeLine[];
  effectiveFrom: string;
  effectiveTo?: string;
  autoGenerate: boolean;
  autoPublish: boolean;
  isActive: boolean;
  version: number;
}

export interface DemandChargeLine {
  chargeHeadId: string;
  chargeCode: string;
  chargeName: string;
  amountPaise: number;
  calculationMethod: string;
}

export interface MaintenanceDemand {
  _id: string;
  billingPlanId: string;
  demandNumber?: string;
  flatId: { _id: string; flatNo?: string } | string;
  // flatId is never populated by the list endpoint — this denormalized snapshot (taken at
  // demand-creation time, so it stays accurate even if the flat is later renamed/moved) is
  // the actual source for display.
  flatSnapshot?: { flatNo?: string; towerId?: string; floorId?: string; areaSqFt?: number };
  demandType: 'REGULAR' | 'LATE_FEE';
  billingPeriodKey: string;
  billingPeriodLabel: string;
  issueDate: string;
  dueDate: string;
  status: McrDemandStatus;
  chargeLines: DemandChargeLine[];
  subtotalPaise: number;
  totalDemandPaise: number;
  advanceAppliedPaise: number;
  paidPaise: number;
  outstandingPaise: number;
  publishedAt?: string;
}

export interface McrPaymentRecord {
  _id: string;
  paymentNumber: string;
  flatId: { _id: string; flatNo?: string; towerId?: { _id: string; name: string } } | string;
  payerName: string;
  payerMobile?: string;
  amountPaise: number;
  paymentMethod: McrPaymentMethod;
  paymentDate: string;
  receivedDate: string;
  status: McrPaymentStatus;
  bankReference?: string;
  upiReference?: string;
  chequeNumber?: string;
  bankName?: string;
  cardReference?: string;
  notes?: string;
  source?: string;
  proofFileIds?: Array<{ _id: string; url: string; originalName?: string; mimeType?: string } | string>;
  enteredBy: string;
  verifiedBy?: string;
  verifiedAt?: string;
  rejectionReason?: string;
  cancellationReason?: string;
  bounceReason?: string;
  receiptId?: string;
  allocatedAmountPaise: number;
  advanceCreatedPaise: number;
}

export interface McrReceipt {
  _id: string;
  receiptNumber: string;
  paymentId: string;
  flatId: { _id: string; flatNo?: string; towerId?: { _id: string; name: string } } | string;
  residentSnapshot: { name: string; mobile?: string; email?: string };
  paymentSnapshot: { payerName: string; paymentMethod: string; paymentDate: string; amountPaise: number };
  allocationSnapshot: Array<{ demandId: string; demandNumber: string; allocatedAmountPaise: number }>;
  amountPaise: number;
  advanceAmountPaise: number;
  issuedAt: string;
  status: McrReceiptStatus;
  voidReason?: string;
  replacementReceiptId?: string;
}

export interface McrReportSummary {
  demandCount: number;
  totalDemandPaise: number;
  advanceAppliedPaise: number;
  paidPaise: number;
  outstandingPaise: number;
  overduePaise: number;
  collectionCount: number;
  collectedPaise: number;
  advanceCreatedPaise: number;
  advanceBalancePaise: number;
  issuedReceiptCount: number;
}

export interface McrTowerSummary {
  towerId: string;
  towerName: string;
  demandCount: number;
  totalDemandPaise: number;
  paidPaise: number;
  outstandingPaise: number;
  overduePaise: number;
  collectionCount: number;
  collectedPaise: number;
  issuedReceiptCount: number;
}

export interface McrStatement {
  flatId: string;
  summary: McrReportSummary;
  demands: MaintenanceDemand[];
  payments: McrPaymentRecord[];
  receipts: McrReceipt[];
  ledger: Array<{
    entryDate: string;
    entryType: string;
    description?: string;
    debitPaise: number;
    creditPaise: number;
    runningBalancePaise: number;
  }>;
}

export interface McrGatewayConfig {
  provider: 'MOCK';
  enabled: boolean;
  publicKey?: string;
  autoVerifySuccessfulPayments: boolean;
}

export interface McrContext {
  moduleCode: string;
  societyId: string;
  enabled: boolean;
  permissions: string[];
  routePrefix: string;
  apiPrefix: string;
}

/** MCR amounts are stored in paise (integers); this renders them as an en-IN currency string. */
export function formatPaise(paise: number | undefined | null, currency = 'INR'): string {
  const value = (paise || 0) / 100;
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency }).format(value);
}

export const DEMAND_STATUS_BADGE: Record<McrDemandStatus, string> = {
  DRAFT: 'badge-gray',
  PUBLISHED: 'badge-blue',
  PARTIALLY_PAID: 'badge-yellow',
  PAID: 'badge-green',
  OVERDUE: 'badge-red',
  CANCELLED: 'badge-gray',
  WRITTEN_OFF: 'badge-purple',
};

export const PAYMENT_STATUS_BADGE: Record<McrPaymentStatus, string> = {
  DRAFT: 'badge-gray',
  PENDING_VERIFICATION: 'badge-yellow',
  VERIFIED: 'badge-green',
  REJECTED: 'badge-red',
  BOUNCED: 'badge-red',
  CANCELLED: 'badge-gray',
  REFUNDED: 'badge-blue',
  PARTIALLY_REFUNDED: 'badge-blue',
};

export const RECEIPT_STATUS_BADGE: Record<McrReceiptStatus, string> = {
  ISSUED: 'badge-green',
  VOID: 'badge-red',
  REPLACED: 'badge-gray',
};

/** Fetches an authenticated binary MCR document (HTML/SVG) and opens it in a new tab via an object URL. */
export async function openMcrDocument(api: AxiosInstance, url: string): Promise<void> {
  const res = await api.get<Blob>(url, { responseType: 'blob' });
  const objectUrl = URL.createObjectURL(res.data);
  window.open(objectUrl, '_blank');
  setTimeout(() => URL.revokeObjectURL(objectUrl), 60000);
}

/** Fetches an authenticated binary MCR document and triggers a real file download (used for the attachment-typed download endpoints). */
export async function downloadMcrDocument(api: AxiosInstance, url: string, fileName: string): Promise<void> {
  const res = await api.get<Blob>(url, { responseType: 'blob' });
  const objectUrl = URL.createObjectURL(res.data);
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(objectUrl), 60000);
}
