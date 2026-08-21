import { z } from 'zod';
import { paiseSchema } from './mcr.validation';

export const chargeHeadCategorySchema = z.enum([
  'MAINTENANCE',
  'SINKING_FUND',
  'REPAIR_FUND',
  'WATER',
  'PARKING',
  'PENALTY',
  'INTEREST',
  'OTHER',
]);

export const chargeHeadCalculationSchema = z.enum([
  'FIXED_FLAT',
  'FIXED_FLAT_TYPE',
  'AREA_BASED',
  'CUSTOM',
]);

export const chargeHeadCreateSchema = z.object({
  code: z.string().trim().min(2).max(24).transform((value) => value.toUpperCase()),
  name: z.string().trim().min(2).max(80),
  description: z.string().trim().max(240).optional(),
  category: chargeHeadCategorySchema.default('MAINTENANCE'),
  isRecurring: z.boolean().default(true),
  defaultAmountPaise: paiseSchema.default(0),
  calculationMethod: chargeHeadCalculationSchema.default('FIXED_FLAT'),
  isActive: z.boolean().default(true),
  displayOrder: z.coerce.number().int().min(0).default(0),
  effectiveFrom: z.coerce.date().optional(),
  effectiveTo: z.coerce.date().optional(),
});

// code is intentionally omitted — changing it after billing plans/demands already reference
// this charge head would desync historical records, so it's fixed at creation.
export const chargeHeadUpdateSchema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  description: z.string().trim().max(240).optional(),
  category: chargeHeadCategorySchema.optional(),
  isRecurring: z.boolean().optional(),
  defaultAmountPaise: paiseSchema.optional(),
  calculationMethod: chargeHeadCalculationSchema.optional(),
  isActive: z.boolean().optional(),
  displayOrder: z.coerce.number().int().min(0).optional(),
  effectiveFrom: z.coerce.date().optional(),
  effectiveTo: z.coerce.date().optional(),
});
