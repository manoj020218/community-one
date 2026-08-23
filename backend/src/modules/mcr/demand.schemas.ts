import { z } from 'zod';
import { objectIdSchema, paiseSchema } from './mcr.validation';

export const demandDraftCreateSchema = z.object({
  billingPlanId: objectIdSchema,
  billingPeriodKey: z.string().trim().min(4).max(16),
  billingPeriodLabel: z.string().trim().min(4).max(40).optional(),
  flatIds: z.array(objectIdSchema).optional(),
  towerId: objectIdSchema.optional(),
  issueDate: z.coerce.date().optional(),
});

export const demandChargeLineSchema = z.object({
  chargeHeadId: objectIdSchema,
  chargeCode: z.string(),
  chargeName: z.string(),
  amountPaise: paiseSchema,
  calculationMethod: z.string(),
});

// DRAFT-only — lets an admin correct an amount before publishing (e.g. a charge that should
// be waived/adjusted for one flat this cycle) without touching chargeHeadId/chargeCode/
// calculationMethod, which stay pinned to what the billing plan actually defined.
export const demandUpdateSchema = z.object({
  chargeLines: z.array(z.object({
    chargeHeadId: objectIdSchema,
    amountPaise: paiseSchema,
  })).min(1),
  dueDate: z.coerce.date().optional(),
});
