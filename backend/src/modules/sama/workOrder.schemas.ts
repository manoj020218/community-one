import { z } from 'zod';
import { stringSchema } from './sama.validation';

const prioritySchema = z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']);
const statusSchema = z.enum(['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']);
const sourceTypeSchema = z.enum(['ADMIN', 'RESIDENT', 'SYSTEM']);

function refineDates<T extends { scheduledStartAt?: Date; scheduledEndAt?: Date }>(value: T, ctx: z.RefinementCtx) {
  if (value.scheduledStartAt && value.scheduledEndAt && value.scheduledStartAt > value.scheduledEndAt) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'scheduledEndAt must be after scheduledStartAt', path: ['scheduledEndAt'] });
  }
}

export const workOrderCreateSchema = z.object({
  societyId: stringSchema.optional(),
  title: stringSchema,
  description: z.string().trim().max(1000).optional(),
  category: stringSchema,
  priority: prioritySchema.optional(),
  sourceType: sourceTypeSchema.optional(),
  flatId: stringSchema.optional(),
  residentId: stringSchema.optional(),
  scheduledStartAt: z.coerce.date().optional(),
  scheduledEndAt: z.coerce.date().optional(),
  slaTargetMinutes: z.coerce.number().int().min(0).optional(),
}).superRefine(refineDates);

export const workOrderAssignSchema = z.object({
  assignedStaffProfileId: stringSchema.optional(),
  assignedServiceProviderId: stringSchema.optional(),
  accessPolicyId: stringSchema.optional(),
  scheduledStartAt: z.coerce.date().optional(),
  scheduledEndAt: z.coerce.date().optional(),
  slaTargetMinutes: z.coerce.number().int().min(0).optional(),
}).superRefine((value, ctx) => {
  refineDates(value, ctx);
  if (!!value.assignedStaffProfileId === !!value.assignedServiceProviderId) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Provide either assignedStaffProfileId or assignedServiceProviderId', path: ['assignedStaffProfileId'] });
  }
});

export const workOrderCompleteSchema = z.object({
  completionNotes: z.string().trim().max(1000).optional(),
  proofFileId: stringSchema.optional(),
  completionProofFileIds: z.array(stringSchema).max(10).optional(),
});

export const workOrderCancelSchema = z.object({
  cancellationReason: z.string().trim().min(1).max(300),
});

export const workOrderRescheduleSchema = z.object({
  scheduledStartAt: z.coerce.date().optional(),
  scheduledEndAt: z.coerce.date().optional(),
  slaTargetMinutes: z.coerce.number().int().min(0).optional(),
  rescheduleReason: z.string().trim().min(1).max(300),
}).superRefine((value, ctx) => {
  refineDates(value, ctx);
  if (!value.scheduledStartAt && !value.scheduledEndAt && value.slaTargetMinutes === undefined) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Provide at least one schedule field to reschedule', path: ['scheduledStartAt'] });
  }
});

export const workOrderEscalateSchema = z.object({
  escalationReason: z.string().trim().min(1).max(300),
  priority: prioritySchema.optional(),
});

export const workOrderRateSchema = z.object({
  rating: z.coerce.number().int().min(1).max(5),
  feedback: z.string().trim().max(1000).optional(),
});

export const workOrderListQuerySchema = z.object({
  societyId: stringSchema.optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  search: z.string().trim().optional(),
  status: statusSchema.optional(),
  priority: prioritySchema.optional(),
  assigneeType: z.enum(['STAFF_PROFILE', 'SERVICE_PROVIDER']).optional(),
  flatId: stringSchema.optional(),
  escalatedOnly: z.coerce.boolean().optional(),
});
