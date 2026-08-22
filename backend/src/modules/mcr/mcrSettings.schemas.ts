import { z } from 'zod';

export const mcrSettingsSchema = z.object({
  financialYearStartMonth: z.coerce.number().int().min(1).max(12).default(4),
  defaultCurrency: z.string().trim().min(3).max(3).transform((value) => value.toUpperCase()).default('INR'),
  societyTimezone: z.string().trim().min(3).max(64).default('Asia/Kolkata'),
  receiptPrefix: z.string().trim().min(1).max(12).default('MCR'),
  demandNumberPrefix: z.string().trim().min(1).max(12).default('MCRD'),
  defaultDueDays: z.coerce.number().int().min(0).max(90).default(15),
  gracePeriodDays: z.coerce.number().int().min(0).max(90).default(0),
  lateFeeEnabled: z.boolean().default(false),
  lateFeeAmountPaise: z.coerce.number().int().min(0).max(5000000).default(0),
  lateFeeIntervalDays: z.coerce.number().int().min(1).max(365).default(30),
  makerCheckerEnabled: z.boolean().default(true),
  allowSelfVerification: z.boolean().default(false),
  allowAdvancePayment: z.boolean().default(true),
  allowPartialPayment: z.boolean().default(true),
  allowResidentPaymentSubmission: z.boolean().default(false),
  publicReceiptVerificationEnabled: z.boolean().default(false),
  collectionUpiId: z.string().trim().max(80).default(''),
  collectionUpiPayeeName: z.string().trim().max(120).default(''),
  reminderAutomationEnabled: z.boolean().default(false),
  reminderFrequencyDays: z.coerce.number().int().min(1).max(14).default(1),
  reminderTimeOfDay: z.string().trim().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Use HH:mm 24-hour format').default('10:00'),
  vacantFlatPolicy: z.enum(['BILL_FULL', 'BILL_REDUCED', 'EXEMPT']).default('BILL_FULL'),
  vacantFlatReducedPercent: z.coerce.number().int().min(0).max(100).default(50),
  unsoldFlatPolicy: z.enum(['BILL_FULL', 'BILL_REDUCED', 'EXEMPT']).default('EXEMPT'),
  unsoldFlatReducedPercent: z.coerce.number().int().min(0).max(100).default(50),
  vacantFlatPolicyConfirmed: z.boolean().default(false),
});

export const mcrSettingsUpdateSchema = mcrSettingsSchema.partial();
export type McrSettingsInput = z.infer<typeof mcrSettingsSchema>;

export function buildDefaultMcrSettingsInput(): McrSettingsInput {
  return mcrSettingsSchema.parse({});
}
