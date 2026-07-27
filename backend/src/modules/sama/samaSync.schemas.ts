import { z } from 'zod';
import { isoDateSchema, stringSchema } from './sama.validation';

export const samaEmployeeSyncSchema = z.object({
  societyId: stringSchema.optional(),
});

export const samaAttendanceSyncSchema = z.object({
  societyId: stringSchema.optional(),
  date: isoDateSchema.optional(),
});

export const samaLeaveSyncSchema = z.object({
  societyId: stringSchema.optional(),
});

export const samaShiftSyncSchema = z.object({
  societyId: stringSchema.optional(),
});

export const samaPayrollSyncSchema = z.object({
  societyId: stringSchema.optional(),
  monthKey: z.string().trim().optional(),
});

export const samaAccessEventSyncSchema = z.object({
  societyId: stringSchema.optional(),
  limit: z.coerce.number().int().min(1).max(500).optional(),
});

export const samaRunDueSyncSchema = z.object({
  societyId: stringSchema.optional(),
});

export const samaRetrySyncRunSchema = z.object({
  societyId: stringSchema.optional(),
});
