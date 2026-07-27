import { z } from 'zod';
import { stringSchema } from './sama.validation';

export const staffEngagementCreateSchema = z.object({
  societyId: stringSchema.optional(),
  staffProfileId: stringSchema,
  engagementType: z.enum(['SOCIETY_PAYROLL', 'HOUSEHOLD_DIRECT', 'SERVICE_POOL', 'CONTRACTOR', 'TEMPORARY']),
  employerType: z.enum(['SOCIETY', 'HOUSEHOLD', 'CONTRACTOR']),
  employerFlatId: stringSchema.optional(),
  employerResidentId: stringSchema.optional(),
  jobTitle: z.string().trim().optional(),
  startDate: z.coerce.date(),
  endDate: z.coerce.date().optional(),
  paymentResponsibility: z.enum(['SOCIETY', 'HOUSEHOLD', 'CONTRACTOR']),
});

export const staffEngagementListQuerySchema = z.object({
  societyId: stringSchema.optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  staffProfileId: stringSchema.optional(),
  status: z.string().trim().optional(),
});
