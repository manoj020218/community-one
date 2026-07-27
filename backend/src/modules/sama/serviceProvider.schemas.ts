import { z } from 'zod';
import { stringSchema } from './sama.validation';

const providerTypeSchema = z.enum(['INDIVIDUAL', 'COMPANY']);
const providerStatusSchema = z.enum(['ACTIVE', 'SUSPENDED', 'INACTIVE']);
const verificationSchema = z.enum(['PENDING', 'APPROVED', 'REJECTED']);

const serviceProviderWriteSchema = z.object({
  displayName: stringSchema,
  contactPersonName: z.string().trim().optional(),
  mobile: stringSchema,
  email: z.string().trim().email().optional(),
  serviceCategories: z.array(stringSchema).max(20).optional().default([]),
  linkedStaffProfileId: stringSchema.optional(),
  notes: z.string().trim().max(1000).optional(),
});

export const serviceProviderCreateSchema = serviceProviderWriteSchema.extend({
  societyId: stringSchema.optional(),
  providerType: providerTypeSchema,
});

export const serviceProviderUpdateSchema = serviceProviderWriteSchema.partial().extend({
  status: providerStatusSchema.optional(),
  verificationStatus: verificationSchema.optional(),
}).refine((value) => Object.keys(value).length > 0, 'At least one provider field must be provided');

export const serviceProviderListQuerySchema = z.object({
  societyId: stringSchema.optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  search: z.string().trim().optional(),
  providerType: providerTypeSchema.optional(),
  status: providerStatusSchema.optional(),
  category: z.string().trim().optional(),
});
