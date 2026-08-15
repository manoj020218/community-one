import { z } from 'zod';
import { ValidationError } from '../../common/errors/AppError';

const objectIdSchema = z.string().trim().min(1);
const zoneTypeSchema = z.enum(['GATE', 'GYM', 'POOL', 'SPA', 'ROOM_BLOCK', 'OTHER']);
const textSchema = z.string().trim().max(500).optional();

export const createZoneSchema = z.object({
  societyId: objectIdSchema,
  name: z.string().trim().min(1).max(100),
  zoneType: zoneTypeSchema,
  description: textSchema,
  linkedGateId: objectIdSchema.optional(),
});

export const updateZoneSchema = z
  .object({
    name: z.string().trim().min(1).max(100).optional(),
    zoneType: zoneTypeSchema.optional(),
    description: textSchema,
    linkedGateId: objectIdSchema.optional(),
  })
  .refine((value) => Object.keys(value).length > 0, 'At least one field is required');

export const bindDeviceSchema = z.object({
  deviceId: objectIdSchema,
});

export const createCredentialSchema = z.object({
  societyId: objectIdSchema,
  residentId: objectIdSchema,
  deviceId: objectIdSchema,
  deviceExternalUserId: z.string().trim().min(1).max(100),
  label: z.string().trim().max(100).optional(),
});

export const createPolicySchema = z.object({
  societyId: objectIdSchema,
  name: z.string().trim().min(1).max(100),
  residentId: objectIdSchema,
  zoneIds: z.array(objectIdSchema).min(1).max(20),
  accessMode: z.enum(['ALWAYS', 'SCHEDULED']).optional(),
  allowedDaysOfWeek: z.array(z.string()).optional(),
  dailyStartTime: z.string().optional(),
  dailyEndTime: z.string().optional(),
  validFrom: z.coerce.date().optional(),
  validUntil: z.coerce.date().optional(),
});

export const updatePolicySchema = z
  .object({
    name: z.string().trim().min(1).max(100).optional(),
    zoneIds: z.array(objectIdSchema).min(1).max(20).optional(),
    accessMode: z.enum(['ALWAYS', 'SCHEDULED']).optional(),
    allowedDaysOfWeek: z.array(z.string()).optional(),
    dailyStartTime: z.string().optional(),
    dailyEndTime: z.string().optional(),
    validFrom: z.coerce.date().optional(),
    validUntil: z.coerce.date().optional(),
    status: z.enum(['ACTIVE', 'SUSPENDED', 'EXPIRED']).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, 'At least one field is required');

export const resolveEventSchema = z.object({
  residentId: objectIdSchema,
});

export function parseAccessInput<T extends z.ZodTypeAny>(schema: T, input: unknown): z.infer<T> {
  try {
    return schema.parse(input);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new ValidationError('Invalid request payload', {
        issues: error.issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
        })),
      });
    }
    throw error;
  }
}
