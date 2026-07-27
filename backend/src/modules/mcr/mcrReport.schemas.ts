import { z } from 'zod';
import { objectIdSchema } from './mcr.validation';

export const mcrReportQuerySchema = z.object({
  flatId: objectIdSchema.optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
});

export type McrReportQuery = z.infer<typeof mcrReportQuerySchema>;
