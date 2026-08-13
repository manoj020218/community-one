import { z } from 'zod';
import { ValidationError } from '../../common/errors/AppError';

const objectIdSchema = z.string().trim().min(1);
const moneySchema = z.coerce.number().min(0);
const dateSchema = z.coerce.date();
const textSchema = z.string().trim().max(500).optional();

const ensureDateRange = <T extends { startDate: Date; endDate: Date }>(value: T) => {
  if (value.endDate < value.startDate) {
    throw new ValidationError('endDate must be on or after startDate');
  }
  return value;
};

export const createLeaseSchema = z
  .object({
    societyId: objectIdSchema,
    flatId: objectIdSchema,
    residentId: objectIdSchema,
    rentAmount: moneySchema,
    depositAmount: moneySchema.optional(),
    billingDay: z.coerce.number().int().min(1).max(28),
    startDate: dateSchema,
    endDate: dateSchema,
    noticePeriodDays: z.coerce.number().int().min(0).optional(),
    remarks: textSchema,
  })
  .transform(ensureDateRange);

export const updateLeaseSchema = z
  .object({
    rentAmount: moneySchema.optional(),
    depositAmount: moneySchema.optional(),
    billingDay: z.coerce.number().int().min(1).max(28).optional(),
    startDate: dateSchema.optional(),
    endDate: dateSchema.optional(),
    noticePeriodDays: z.coerce.number().int().min(0).optional(),
    remarks: textSchema,
  })
  .refine((value) => Object.keys(value).length > 0, 'At least one field is required');

export const renewLeaseSchema = z.object({
  newEndDate: dateSchema,
  newRentAmount: moneySchema.optional(),
});

export const terminateLeaseSchema = z.object({
  terminationDate: dateSchema,
  reason: z.string().trim().max(500).optional(),
  depositRefundAmount: moneySchema.optional(),
});

export const leaseStatusSchema = z.enum(['ACTIVE', 'EXPIRED', 'TERMINATED', 'RENEWED']);

export function parseLeaseInput<T extends z.ZodTypeAny>(schema: T, input: unknown): z.infer<T> {
  try {
    return schema.parse(input);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new ValidationError('Invalid request payload', {
        issues: error.issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
        })),
      });
    }
    throw error;
  }
}
