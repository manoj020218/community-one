import { z } from 'zod';
import { MCR_NOTIFICATION_CHANNELS } from './mcrDomain.types';

export const receiptVoidSchema = z.object({
  reason: z.string().trim().min(3).max(250),
});

export const receiptReplaceSchema = z.object({
  reason: z.string().trim().min(3).max(250),
});

export const receiptSendSchema = z.object({
  channels: z.array(z.enum(MCR_NOTIFICATION_CHANNELS)).min(1),
  email: z.string().trim().email().optional(),
  mobile: z.string().trim().min(10).max(20).optional(),
});
