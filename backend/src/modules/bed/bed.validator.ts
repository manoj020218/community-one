import { z } from 'zod';
import { ValidationError } from '../../common/errors/AppError';

const objectIdSchema = z.string().trim().min(1);
const bedNumberSchema = z.string().trim().min(1).max(20);
const bedStatusSchema = z.enum(['VACANT', 'OCCUPIED', 'MAINTENANCE', 'RESERVED']);

export const createBedSchema = z.object({
  societyId: objectIdSchema,
  flatId: objectIdSchema,
  bedNumber: bedNumberSchema,
});

export const generateBedsSchema = z.object({
  societyId: objectIdSchema,
  flatId: objectIdSchema,
  count: z.coerce.number().int().min(1).max(20),
});

export const updateBedSchema = z
  .object({
    bedNumber: bedNumberSchema.optional(),
    status: bedStatusSchema.optional(),
  })
  .refine((value) => Object.keys(value).length > 0, 'At least one field is required');

export const assignBedSchema = z.object({
  residentId: objectIdSchema,
});

export function parseBedInput<T extends z.ZodTypeAny>(schema: T, input: unknown): z.infer<T> {
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
