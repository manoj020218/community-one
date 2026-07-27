import { z } from 'zod';
import { MCR_PAYMENT_METHODS } from './mcrDomain.types';
import { objectIdSchema, paiseSchema } from './mcr.validation';

const paymentMethodSchema = z.enum(MCR_PAYMENT_METHODS);

export const createMcrPaymentSchema = z.object({
  flatId: objectIdSchema,
  residentId: objectIdSchema.optional(),
  payerName: z.string().trim().min(2).max(120),
  payerMobile: z.string().trim().min(10).max(20).optional(),
  amountPaise: paiseSchema.min(1),
  paymentMethod: paymentMethodSchema,
  paymentDate: z.coerce.date().optional(),
  receivedDate: z.coerce.date().optional(),
  bankReference: z.string().trim().min(1).max(80).optional(),
  upiReference: z.string().trim().min(1).max(80).optional(),
  chequeNumber: z.string().trim().min(1).max(40).optional(),
  chequeDate: z.coerce.date().optional(),
  bankName: z.string().trim().min(1).max(120).optional(),
  cardReference: z.string().trim().min(1).max(80).optional(),
  cashCollectionReference: z.string().trim().min(1).max(80).optional(),
  notes: z.string().trim().max(500).optional(),
  proofFileIds: z.array(objectIdSchema).max(10).default([]),
  idempotencyKey: z.string().trim().min(1).max(64).optional(),
}).superRefine((value, ctx) => {
  if (value.paymentMethod === 'CHEQUE' && (!value.chequeNumber || !value.chequeDate || !value.bankName)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['chequeNumber'], message: 'Cheque number, cheque date, and bank name are required for cheque payments' });
  }
  if (value.paymentMethod === 'UPI' && !value.upiReference) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['upiReference'], message: 'UPI reference is required for UPI payments' });
  }
  if (value.paymentMethod === 'BANK_TRANSFER' && !value.bankReference) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['bankReference'], message: 'Bank reference is required for bank transfers' });
  }
  if (value.paymentMethod === 'CARD_OFFLINE' && !value.cardReference) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['cardReference'], message: 'Card reference is required for offline card payments' });
  }
});

export const verifyMcrPaymentSchema = z.object({
  allocations: z.array(z.object({
    demandId: objectIdSchema,
    amountPaise: paiseSchema.min(1),
  })).min(1).optional(),
});

export const rejectMcrPaymentSchema = z.object({
  reason: z.string().trim().min(3).max(250),
});

export const cancelMcrPaymentSchema = z.object({
  reason: z.string().trim().min(3).max(250),
});

export const bounceMcrPaymentSchema = z.object({
  reason: z.string().trim().min(3).max(250),
});
