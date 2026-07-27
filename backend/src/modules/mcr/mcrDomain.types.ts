export const MCR_SEQUENCE_TYPES = ['DEMAND', 'RECEIPT', 'PAYMENT', 'LEDGER'] as const;
export type McrSequenceType = typeof MCR_SEQUENCE_TYPES[number];

export const MCR_DEMAND_STATUSES = [
  'DRAFT',
  'PUBLISHED',
  'PARTIALLY_PAID',
  'PAID',
  'OVERDUE',
  'CANCELLED',
  'WRITTEN_OFF',
] as const;

export const MCR_PAYMENT_METHODS = [
  'CASH',
  'CHEQUE',
  'UPI',
  'BANK_TRANSFER',
  'CARD_OFFLINE',
  'PAYMENT_GATEWAY',
  'OTHER',
] as const;

export const MCR_PAYMENT_STATUSES = [
  'DRAFT',
  'PENDING_VERIFICATION',
  'VERIFIED',
  'REJECTED',
  'BOUNCED',
  'CANCELLED',
  'REFUNDED',
  'PARTIALLY_REFUNDED',
] as const;

export const MCR_PAYMENT_ALLOCATION_TYPES = [
  'MANUAL',
  'OLDEST_FIRST',
  'SELECTED_DEMAND',
  'ADVANCE',
  'REVERSAL',
] as const;

export const MCR_RECEIPT_STATUSES = ['ISSUED', 'VOID', 'REPLACED'] as const;

export const MCR_LEDGER_ENTRY_TYPES = [
  'DEMAND',
  'PAYMENT',
  'LATE_FEE',
  'WAIVER',
  'CREDIT_NOTE',
  'DEBIT_NOTE',
  'REFUND',
  'REVERSAL',
  'ADVANCE',
  'OPENING_BALANCE',
  'WRITE_OFF',
] as const;

export const MCR_LEDGER_SOURCE_TYPES = [
  'DEMAND',
  'PAYMENT',
  'RECEIPT',
  'ADJUSTMENT',
  'SYSTEM',
] as const;

export const MCR_NOTIFICATION_CHANNELS = [
  'IN_APP',
  'PUSH',
  'WHATSAPP',
  'EMAIL',
  'SMS',
] as const;

export const MCR_NOTIFICATION_STATUSES = [
  'QUEUED',
  'SENT',
  'DELIVERED',
  'FAILED',
  'SKIPPED',
  'CANCELLED',
] as const;
