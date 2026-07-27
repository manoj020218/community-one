import { z } from 'zod';
import { isoDateSchema, stringSchema } from './sama.validation';

const paginationSchema = z.object({
  societyId: stringSchema.optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

export const samaStaffListQuerySchema = paginationSchema.extend({
  search: z.string().trim().optional(),
  status: z.string().trim().optional(),
});

export const samaAttendanceListQuerySchema = paginationSchema.extend({
  date: isoDateSchema.optional(),
  externalStaffId: z.string().trim().optional(),
});

export const samaLeaveListQuerySchema = paginationSchema.extend({
  status: z.string().trim().optional(),
  externalStaffId: z.string().trim().optional(),
});

export const samaPayrollRunListQuerySchema = paginationSchema.extend({
  monthKey: z.string().trim().optional(),
  status: z.string().trim().optional(),
});

export const samaSyncRunListQuerySchema = paginationSchema.extend({
  syncType: z.string().trim().optional(),
  status: z.string().trim().optional(),
});

export const samaAccessEventListQuerySchema = paginationSchema.extend({
  eventType: z.string().trim().optional(),
  externalDeviceId: z.string().trim().optional(),
  jenixDeviceId: z.string().trim().optional(),
  exceptionStatus: z.string().trim().optional(),
});
