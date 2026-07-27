import { z } from 'zod';
import { stringSchema } from './sama.validation';

export const staffProfileCreateSchema = z.object({
  societyId: stringSchema.optional(),
  firstName: stringSchema,
  lastName: z.string().trim().optional(),
  displayName: stringSchema,
  mobile: stringSchema,
  email: z.string().trim().email().optional(),
  staffType: z.enum(['SOCIETY_EMPLOYEE', 'HOUSEHOLD_STAFF', 'SERVICE_POOL_WORKER', 'CONTRACTOR_EMPLOYEE', 'TEMPORARY_WORKER']),
  primaryCategory: z.string().trim().optional(),
  photoFileId: stringSchema.optional(),
});

export const staffProfileUpdateSchema = staffProfileCreateSchema
  .omit({ societyId: true, staffType: true, mobile: true })
  .extend({
    accessStatus: z.enum(['ACTIVE', 'SUSPENDED', 'BLOCKED']).optional(),
    verificationStatus: z.enum(['PENDING', 'APPROVED', 'REJECTED']).optional(),
    lifecycleStatus: z.enum(['ACTIVE', 'SUSPENDED', 'TERMINATED']).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, 'At least one staff field must be provided');

export const staffProfileListQuerySchema = z.object({
  societyId: stringSchema.optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  search: z.string().trim().optional(),
  staffType: z.string().trim().optional(),
  accessStatus: z.string().trim().optional(),
  lifecycleStatus: z.string().trim().optional(),
});

export const staffProfileApproveSchema = z.object({});

export const staffProfileSuspendSchema = z.object({
  reason: z.string().trim().min(1).max(300),
});

export const staffProfileReinstateSchema = z.object({});

export const staffProfileTerminateSchema = z.object({
  reason: z.string().trim().min(1).max(300),
});
