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
});

export const mcrSettingsUpdateSchema = mcrSettingsSchema.partial();
export type McrSettingsInput = z.infer<typeof mcrSettingsSchema>;

export function buildDefaultMcrSettingsInput(): McrSettingsInput {
  return mcrSettingsSchema.parse({});
}
