import { z } from 'zod';
import { objectIdSchema, paiseSchema } from './mcr.validation';
import { EXPENSE_CATEGORIES, EXPENSE_PAYMENT_MODES } from './expense.model';

export const createExpenseSchema = z.object({
  category: z.enum(EXPENSE_CATEGORIES),
  amountPaise: paiseSchema.min(1),
  paymentMode: z.enum(EXPENSE_PAYMENT_MODES),
  paidTo: z.string().trim().min(1).max(120),
  expenseDate: z.coerce.date(),
  description: z.string().trim().max(500).optional(),
  proofFileIds: z.array(objectIdSchema).max(10).default([]),
});

export const cancelExpenseSchema = z.object({
  reason: z.string().trim().min(3).max(250),
});

export const expenseQuerySchema = z.object({
  category: z.enum(EXPENSE_CATEGORIES).optional(),
  paymentMode: z.enum(EXPENSE_PAYMENT_MODES).optional(),
  search: z.string().trim().max(120).optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
});
