import { z } from 'zod';
import { objectIdSchema, paiseSchema } from './mcr.validation';

export const billingPlanChargeLineSchema = z.object({
  chargeHeadId: objectIdSchema,
  amountPaise: paiseSchema,
  calculationMethod: z.enum(['FIXED_FLAT', 'FIXED_FLAT_TYPE', 'AREA_BASED', 'CUSTOM']).default('FIXED_FLAT'),
});

export const billingPlanCreateSchema = z.object({
  name: z.string().trim().min(2).max(80),
  frequency: z.enum(['MONTHLY', 'QUARTERLY', 'HALF_YEARLY', 'YEARLY', 'ONE_TIME']),
  billingDay: z.coerce.number().int().min(1).max(31),
  dueDay: z.coerce.number().int().min(1).max(31),
  chargeLines: z.array(billingPlanChargeLineSchema).min(1),
  effectiveFrom: z.coerce.date(),
  effectiveTo: z.coerce.date().optional(),
  autoGenerate: z.boolean().default(false),
  autoPublish: z.boolean().default(false),
  isActive: z.boolean().default(true),
});

export const billingPlanUpdateSchema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  frequency: z.enum(['MONTHLY', 'QUARTERLY', 'HALF_YEARLY', 'YEARLY', 'ONE_TIME']).optional(),
  billingDay: z.coerce.number().int().min(1).max(31).optional(),
  dueDay: z.coerce.number().int().min(1).max(31).optional(),
  chargeLines: z.array(billingPlanChargeLineSchema).min(1).optional(),
  effectiveFrom: z.coerce.date().optional(),
  effectiveTo: z.coerce.date().optional(),
  autoGenerate: z.boolean().optional(),
  autoPublish: z.boolean().optional(),
  isActive: z.boolean().optional(),
});
