import { NotFoundError, ValidationError } from '../../common/errors/AppError';
import { FileAsset } from '../fileAsset/fileAsset.model';
import { Expense, IExpenseDocument } from './expense.model';
import { createExpenseSchema, cancelExpenseSchema, expenseQuerySchema } from './expense.schemas';
import { mcrNumberingService } from './mcrNumbering.service';
import { parseOrThrow } from './mcr.validation';

export interface ExpenseQuery {
  category?: string;
  paymentMode?: string;
  search?: string;
  startDate?: Date;
  endDate?: Date;
}

export class ExpenseService {
  async create(societyId: string, input: unknown, actorUserId: string): Promise<IExpenseDocument> {
    const dto = parseOrThrow(createExpenseSchema, input);
    await this.assertProofFiles(societyId, dto.proofFileIds);
    const expenseNumber = await mcrNumberingService.nextExpenseNumber(societyId, dto.expenseDate);

    return Expense.create({
      societyId,
      expenseNumber,
      category: dto.category,
      amountPaise: dto.amountPaise,
      paymentMode: dto.paymentMode,
      paidTo: dto.paidTo,
      expenseDate: dto.expenseDate,
      description: dto.description,
      proofFileIds: dto.proofFileIds,
      status: 'RECORDED',
      createdBy: actorUserId,
      updatedBy: actorUserId,
    });
  }

  async listBySociety(societyId: string, query: unknown): Promise<IExpenseDocument[]> {
    const parsed = parseOrThrow(expenseQuerySchema, query);
    const filter: Record<string, unknown> = { societyId };
    if (parsed.category) filter.category = parsed.category;
    if (parsed.paymentMode) filter.paymentMode = parsed.paymentMode;
    if (parsed.startDate || parsed.endDate) {
      filter.expenseDate = {
        ...(parsed.startDate ? { $gte: parsed.startDate } : {}),
        ...(parsed.endDate ? { $lte: parsed.endDate } : {}),
      };
    }
    if (parsed.search) {
      filter.$or = [
        { paidTo: { $regex: parsed.search, $options: 'i' } },
        { description: { $regex: parsed.search, $options: 'i' } },
        { expenseNumber: { $regex: parsed.search, $options: 'i' } },
      ];
    }
    return Expense.find(filter)
      .sort({ expenseDate: -1, createdAt: -1 })
      .populate('proofFileIds', 'url originalName mimeType');
  }

  // No refund flow, same reasoning as MCR payments/demands — never hard-delete a financial
  // record, only mark it cancelled so it drops out of Fund Balance while staying auditable.
  async cancel(societyId: string, id: string, input: unknown, actorUserId: string): Promise<IExpenseDocument> {
    const dto = parseOrThrow(cancelExpenseSchema, input);
    const expense = await Expense.findOne({ _id: id, societyId });
    if (!expense) throw new NotFoundError('Expense');
    if (expense.status === 'CANCELLED') return expense;

    expense.status = 'CANCELLED';
    expense.cancellationReason = dto.reason;
    expense.cancelledBy = actorUserId;
    expense.cancelledAt = new Date();
    expense.updatedBy = actorUserId;
    await expense.save();
    return expense;
  }

  private async assertProofFiles(societyId: string, proofFileIds: string[]): Promise<void> {
    if (!proofFileIds.length) return;
    const count = await FileAsset.countDocuments({ _id: { $in: proofFileIds }, societyId });
    if (count !== proofFileIds.length) {
      throw new ValidationError('One or more proof files were not found for this society');
    }
  }
}

export const expenseService = new ExpenseService();
