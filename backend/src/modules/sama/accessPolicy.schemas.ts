import { z } from 'zod';
import { stringSchema } from './sama.validation';

const subjectTypeSchema = z.enum(['STAFF_PROFILE', 'SERVICE_PROVIDER', 'WORK_ORDER']);
const accessModeSchema = z.enum(['ALWAYS', 'SCHEDULED', 'ONE_TIME_WINDOW']);
const statusSchema = z.enum(['ACTIVE', 'SUSPENDED', 'EXPIRED']);
const daySchema = z.enum(['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']);
const timeSchema = z.string().trim().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'time must be HH:MM');

function refineWindow<T extends { dailyStartTime?: string; dailyEndTime?: string; validFrom?: Date; validUntil?: Date; accessMode?: string }>(value: T, ctx: z.RefinementCtx) {
  if (!!value.dailyStartTime !== !!value.dailyEndTime) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'dailyStartTime and dailyEndTime must be provided together', path: ['dailyStartTime'] });
  }
  if (value.validFrom && value.validUntil && value.validFrom > value.validUntil) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'validUntil must be after validFrom', path: ['validUntil'] });
  }
  if (value.accessMode === 'ONE_TIME_WINDOW' && (!value.validFrom || !value.validUntil)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'ONE_TIME_WINDOW requires validFrom and validUntil', path: ['accessMode'] });
  }
}

const accessPolicyMutableSchema = z.object({
  name: stringSchema,
  accessMode: accessModeSchema.default('ALWAYS'),
  allowedGateIds: z.array(stringSchema).max(20).optional().default([]),
  allowedDeviceIds: z.array(stringSchema).max(50).optional().default([]),
  allowedDaysOfWeek: z.array(daySchema).optional().default([]),
  dailyStartTime: timeSchema.optional(),
  dailyEndTime: timeSchema.optional(),
  validFrom: z.coerce.date().optional(),
  validUntil: z.coerce.date().optional(),
});

export const accessPolicyCreateSchema = accessPolicyMutableSchema.extend({
  societyId: stringSchema.optional(),
  subjectType: subjectTypeSchema,
  subjectId: stringSchema,
}).superRefine(refineWindow);

export const accessPolicyUpdateSchema = accessPolicyMutableSchema.partial().extend({
  status: statusSchema.optional(),
}).refine((value) => Object.keys(value).length > 0, 'At least one access policy field must be provided').superRefine(refineWindow);

export const accessPolicyListQuerySchema = z.object({
  societyId: stringSchema.optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  subjectType: subjectTypeSchema.optional(),
  subjectId: stringSchema.optional(),
  status: statusSchema.optional(),
});
