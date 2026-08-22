import { NextFunction, Response } from 'express';
import { AuthenticatedRequest } from '../../common/types';
import { sendCreated, sendSuccess } from '../../common/utils/response';
import { auditService } from '../audit/audit.service';
import { McrActorContext, mcrAccessService } from './mcr.access.service';
import { expenseService } from './expense.service';

function resolveContext(req: AuthenticatedRequest): Promise<McrActorContext> {
  const societyId = typeof req.body.societyId === 'string'
    ? req.body.societyId
    : typeof req.query.societyId === 'string'
      ? req.query.societyId
      : undefined;
  return mcrAccessService.getActorContext(req.user!, societyId);
}

export class ExpenseController {
  async list(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const context = await resolveContext(req);
      const items = await expenseService.listBySociety(context.societyId, req.query);
      sendSuccess(res, items, 'Expenses retrieved');
    } catch (error) { next(error); }
  }

  async create(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const context = await resolveContext(req);
      const expense = await expenseService.create(context.societyId, req.body, context.user.userId);
      await auditService.log({
        societyId: context.societyId,
        actorUserId: context.user.userId,
        actorRole: context.user.roleCode,
        moduleCode: 'MCR',
        action: 'MCR_EXPENSE_RECORDED',
        entityType: 'Expense',
        entityId: expense._id!.toString(),
        newValue: { expenseNumber: expense.expenseNumber, category: expense.category, amountPaise: expense.amountPaise },
        ipAddress: req.ip,
      });
      sendCreated(res, expense, 'Expense recorded');
    } catch (error) { next(error); }
  }

  async cancel(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const context = await resolveContext(req);
      const expense = await expenseService.cancel(context.societyId, req.params.id, req.body, context.user.userId);
      await auditService.log({
        societyId: context.societyId,
        actorUserId: context.user.userId,
        actorRole: context.user.roleCode,
        moduleCode: 'MCR',
        action: 'MCR_EXPENSE_CANCELLED',
        entityType: 'Expense',
        entityId: expense._id!.toString(),
        newValue: { expenseNumber: expense.expenseNumber, reason: expense.cancellationReason },
        ipAddress: req.ip,
      });
      sendSuccess(res, expense, 'Expense cancelled');
    } catch (error) { next(error); }
  }
}

export const expenseController = new ExpenseController();
