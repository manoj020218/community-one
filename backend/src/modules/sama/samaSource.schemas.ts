import { z } from 'zod';
import { stringSchema } from './sama.validation';

const samaScheduledSyncTypeSchema = z.enum(['EMPLOYEES', 'ATTENDANCE', 'LEAVES', 'SHIFTS', 'PAYROLL', 'ACCESS_EVENTS']);

export const samaSourceUpdateSchema = z
  .object({
    societyId: stringSchema.optional(),
    baseUrl: z.string().trim().url().optional(),
    apiPrefix: z.string().trim().min(1).optional(),
    accessToken: z.string().trim().min(1).optional(),
    clearAccessToken: z.boolean().optional(),
    isActive: z.boolean().optional(),
    syncScheduleEnabled: z.boolean().optional(),
    syncIntervalMinutes: z.coerce.number().int().min(5).max(1440).optional(),
    scheduledSyncTypes: z.array(samaScheduledSyncTypeSchema).min(1).optional(),
    syncRetryLimit: z.coerce.number().int().min(1).max(5).optional(),
    staleAfterMinutes: z.coerce.number().int().min(15).max(10080).optional(),
  })
  .refine(
    (value) => Object.keys(value).length > 0,
    'At least one source field must be provided'
  );
