import { z } from 'zod';
import { objectIdSchema, paiseSchema } from './mcr.validation';

export const setOpeningBalanceSchema = z.object({
  asOfDate: z.coerce.date(),
  openingCashPaise: paiseSchema.default(0),
  openingBankPaise: paiseSchema.default(0),
});

export const bulkOpeningDuesSchema = z.object({
  asOfDate: z.coerce.date(),
  entries: z.array(z.object({
    flatId: objectIdSchema,
    amountPaise: paiseSchema.min(1),
  })).min(1).max(2000),
});
