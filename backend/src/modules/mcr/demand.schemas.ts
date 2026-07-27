import { z } from 'zod';
import { objectIdSchema, paiseSchema } from './mcr.validation';

export const demandDraftCreateSchema = z.object({
  billingPlanId: objectIdSchema,
  billingPeriodKey: z.string().trim().min(4).max(16),
  billingPeriodLabel: z.string().trim().min(4).max(40).optional(),
  flatIds: z.array(objectIdSchema).optional(),
  issueDate: z.coerce.date().optional(),
});

export const demandChargeLineSchema = z.object({
  chargeHeadId: objectIdSchema,
  chargeCode: z.string(),
  chargeName: z.string(),
  amountPaise: paiseSchema,
  calculationMethod: z.string(),
});
