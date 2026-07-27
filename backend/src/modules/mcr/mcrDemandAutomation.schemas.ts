import { z } from 'zod';

export const mcrDemandAutomationRunSchema = z.object({
  asOf: z.coerce.date().default(() => new Date()),
  limit: z.coerce.number().int().min(1).max(24).default(12),
});
