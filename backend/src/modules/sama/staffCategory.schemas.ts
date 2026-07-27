import { z } from 'zod';
import { stringSchema } from './sama.validation';

const samaStaffTypeSchema = z.enum([
  'SOCIETY_EMPLOYEE',
  'HOUSEHOLD_STAFF',
  'SERVICE_POOL_WORKER',
  'CONTRACTOR_EMPLOYEE',
  'TEMPORARY_WORKER',
]);

export const staffCategoryCreateSchema = z.object({
  societyId: stringSchema.optional(),
  code: stringSchema,
  name: stringSchema,
  staffTypes: z.array(samaStaffTypeSchema).min(1),
  description: z.string().trim().max(500).optional(),
  defaultMonthlyRatePaise: z.coerce.number().int().min(0).optional(),
  requiresSocietyApproval: z.boolean().optional(),
});

export const staffCategoryUpdateSchema = staffCategoryCreateSchema
  .omit({ societyId: true, code: true })
  .partial()
  .extend({ isActive: z.boolean().optional() })
  .refine((value) => Object.keys(value).length > 0, 'At least one category field must be provided');

export const staffCategoryListQuerySchema = z.object({
  societyId: stringSchema.optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  isActive: z.coerce.boolean().optional(),
});
