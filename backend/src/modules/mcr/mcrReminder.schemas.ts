import { z } from 'zod';
import { MCR_NOTIFICATION_CHANNELS } from './mcrDomain.types';

export const mcrReminderRunSchema = z.object({
  dueBefore: z.coerce.date().optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  channels: z.array(z.enum(MCR_NOTIFICATION_CHANNELS)).min(1).default(['IN_APP']),
});
