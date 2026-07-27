import { z } from 'zod';

export const mcrLateFeeRunSchema = z.object({
  asOfDate: z.coerce.date().optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});
