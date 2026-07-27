import { z } from 'zod';
import { stringSchema } from './sama.validation';

const externalDeviceTypeSchema = z.enum(['M68', 'U5']);

export const samaDeviceBindingCreateSchema = z.object({
  societyId: stringSchema.optional(),
  externalDeviceType: externalDeviceTypeSchema,
  externalDeviceId: stringSchema,
  externalDeviceName: z.string().trim().optional(),
  jenixDeviceId: stringSchema,
  isActive: z.boolean().optional(),
});

export const samaDeviceBindingUpdateSchema = z.object({
  externalDeviceName: z.string().trim().optional(),
  jenixDeviceId: stringSchema.optional(),
  isActive: z.boolean().optional(),
}).refine((value) => Object.keys(value).length > 0, 'At least one device binding field must be provided');

export const samaDeviceBindingListQuerySchema = z.object({
  societyId: stringSchema.optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  externalDeviceType: externalDeviceTypeSchema.optional(),
  isActive: z.coerce.boolean().optional(),
});
