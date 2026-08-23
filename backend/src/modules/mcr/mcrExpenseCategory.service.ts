import { ConflictError } from '../../common/errors/AppError';
import { EXPENSE_CATEGORIES } from './expense.model';
import { McrExpenseCategory, IMcrExpenseCategoryDocument } from './mcrExpenseCategory.model';
import { createExpenseCategorySchema } from './expense.schemas';
import { parseOrThrow } from './mcr.validation';

export class McrExpenseCategoryService {
  async listBySociety(societyId: string): Promise<IMcrExpenseCategoryDocument[]> {
    return McrExpenseCategory.find({ societyId, isActive: true }).sort({ name: 1 });
  }

  async create(societyId: string, input: unknown, actorUserId: string): Promise<IMcrExpenseCategoryDocument> {
    const dto = parseOrThrow(createExpenseCategorySchema, input);
    const normalized = dto.name.trim();
    if (EXPENSE_CATEGORIES.some((c) => c.toLowerCase() === normalized.toLowerCase())) {
      throw new ConflictError(`"${normalized}" is already a built-in category`);
    }
    try {
      return await McrExpenseCategory.create({ societyId, name: normalized, createdBy: actorUserId });
    } catch (error: any) {
      if (error?.code === 11000) throw new ConflictError(`Category "${normalized}" already exists`);
      throw error;
    }
  }
}

export const mcrExpenseCategoryService = new McrExpenseCategoryService();
