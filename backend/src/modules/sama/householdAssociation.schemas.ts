import { z } from 'zod';
import { stringSchema } from './sama.validation';

export const householdAssociationCreateSchema = z.object({
  societyId: stringSchema.optional(),
  staffProfileId: stringSchema,
  engagementId: stringSchema,
  flatId: stringSchema,
  residentId: stringSchema,
  services: z.array(z.string().trim().min(1)).min(1),
  monthlyRatePaise: z.coerce.number().int().min(0).optional(),
});

export const householdAssociationListQuerySchema = z.object({
  societyId: stringSchema.optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  flatId: stringSchema.optional(),
  status: z.string().trim().optional(),
});
