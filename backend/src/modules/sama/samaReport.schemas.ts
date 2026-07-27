import { z } from 'zod';
import { stringSchema } from './sama.validation';

export const samaDashboardQuerySchema = z.object({
  societyId: stringSchema.optional(),
});

export const samaPaymentReportQuerySchema = z.object({
  societyId: stringSchema.optional(),
  flatId: stringSchema.optional(),
  billingMonth: z.string().trim().regex(/^\d{4}-\d{2}$/).optional(),
});

export const samaWorkOrderReportQuerySchema = z.object({
  societyId: stringSchema.optional(),
  flatId: stringSchema.optional(),
  status: z.string().trim().optional(),
  assignedServiceProviderId: stringSchema.optional(),
  escalatedOnly: z.coerce.boolean().optional(),
});

export const samaAccessExceptionReportQuerySchema = z.object({
  societyId: stringSchema.optional(),
  exceptionStatus: z.string().trim().optional(),
});

export const samaExportQuerySchema = z.object({
  societyId: stringSchema.optional(),
  reportType: z.enum(['STAFF', 'PROVIDERS', 'HOUSEHOLD_PAYMENTS', 'WORK_ORDERS', 'SYNC_HEALTH', 'ACCESS_EXCEPTIONS']),
  format: z.enum(['CSV']).default('CSV'),
  flatId: stringSchema.optional(),
  billingMonth: z.string().trim().regex(/^\d{4}-\d{2}$/).optional(),
  status: z.string().trim().optional(),
  assignedServiceProviderId: stringSchema.optional(),
  escalatedOnly: z.coerce.boolean().optional(),
  exceptionStatus: z.string().trim().optional(),
});
