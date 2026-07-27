import { z } from 'zod';
import { ValidationError } from '../../common/errors/AppError';

export const objectIdSchema = z.string().trim().min(1);
export const paiseSchema = z.coerce.number().int().min(0);

export function parseOrThrow<T extends z.ZodTypeAny>(schema: T, input: unknown): z.infer<T> {
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
