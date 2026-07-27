import { z } from 'zod';
import { objectIdSchema, paiseSchema } from './mcr.validation';

export const mcrGatewayConfigSchema = z.object({
  provider: z.enum(['MOCK']).default('MOCK'),
  enabled: z.boolean().default(false),
  publicKey: z.string().trim().min(1).max(200).optional(),
  secretKey: z.string().trim().min(1).max(200).optional(),
  webhookSecret: z.string().trim().min(1).max(200).optional(),
  autoVerifySuccessfulPayments: z.boolean().default(true),
});

export const mcrGatewayOrderSchema = z.object({
  flatId: objectIdSchema.optional(),
  residentId: objectIdSchema.optional(),
  amountPaise: paiseSchema.min(1).optional(),
  payerName: z.string().trim().min(2).max(120).optional(),
  payerMobile: z.string().trim().min(10).max(20).optional(),
});
