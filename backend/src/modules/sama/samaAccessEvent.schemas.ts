import { z } from 'zod';
import { stringSchema } from './sama.validation';

export const samaAccessEventResolveSchema = z.object({
  action: z.enum(['RESOLVE', 'IGNORE']),
  bindingId: stringSchema.optional(),
  resolutionNotes: z.string().trim().max(500).optional(),
}).superRefine((value, ctx) => {
  if (value.action === 'RESOLVE' && !value.bindingId) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'bindingId is required to resolve an access exception', path: ['bindingId'] });
  }
});
