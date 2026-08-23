import { z } from 'zod';
import { objectIdSchema, paiseSchema } from './mcr.validation';
import { EXPENSE_PAYMENT_MODES } from './expense.model';

// category is a free string (society-defined, see mcrExpenseCategory.model.ts) not an enum —
// only length-bounded here.
const categorySchema = z.string().trim().min(1).max(60);

export const createExpenseSchema = z.object({
  category: categorySchema,
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
  category: categorySchema.optional(),
  paymentMode: z.enum(EXPENSE_PAYMENT_MODES).optional(),
  search: z.string().trim().max(120).optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
});

export const createExpenseCategorySchema = z.object({
  name: z.string().trim().min(1).max(60),
});
