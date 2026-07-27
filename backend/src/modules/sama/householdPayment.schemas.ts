import { z } from 'zod';
import { stringSchema } from './sama.validation';

const monthSchema = z.string().trim().regex(/^\d{4}-\d{2}$/, 'billingMonth must be YYYY-MM');

export const householdRateCardCreateSchema = z.object({
  societyId: stringSchema.optional(),
  associationId: stringSchema,
  monthlyRatePaise: z.coerce.number().int().min(0),
  overtimeRatePaise: z.coerce.number().int().min(0).optional(),
  effectiveFrom: z.coerce.date(),
  effectiveTo: z.coerce.date().optional(),
  notes: z.string().trim().max(500).optional(),
});

export const householdRateCardUpdateSchema = householdRateCardCreateSchema
  .omit({ societyId: true, associationId: true })
  .partial()
  .extend({ isActive: z.boolean().optional() })
  .refine((value) => Object.keys(value).length > 0, 'At least one rate-card field must be provided');

export const householdPaymentCreateSchema = z.object({
  societyId: stringSchema.optional(),
  associationId: stringSchema,
  rateCardId: stringSchema.optional(),
  billingMonth: monthSchema,
  duePaise: z.coerce.number().int().min(0),
  paidPaise: z.coerce.number().int().min(0).optional(),
  paymentMethod: z.string().trim().max(100).optional(),
  paidAt: z.coerce.date().optional(),
  notes: z.string().trim().max(500).optional(),
  receiptRef: z.string().trim().max(100).optional(),
});

export const householdPaymentUpdateSchema = householdPaymentCreateSchema
  .omit({ societyId: true, associationId: true, billingMonth: true })
  .partial()
  .refine((value) => Object.keys(value).length > 0, 'At least one payment field must be provided');

export const householdPaymentListQuerySchema = z.object({
  societyId: stringSchema.optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  flatId: stringSchema.optional(),
  billingMonth: monthSchema.optional(),
  status: z.string().trim().optional(),
});
