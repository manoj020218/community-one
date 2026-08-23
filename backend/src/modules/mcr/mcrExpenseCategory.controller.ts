import { NextFunction, Response } from 'express';
import { AuthenticatedRequest } from '../../common/types';
import { sendCreated, sendSuccess } from '../../common/utils/response';
import { McrActorContext, mcrAccessService } from './mcr.access.service';
import { mcrExpenseCategoryService } from './mcrExpenseCategory.service';

function resolveContext(req: AuthenticatedRequest): Promise<McrActorContext> {
  const societyId = typeof req.body.societyId === 'string'
    ? req.body.societyId
    : typeof req.query.societyId === 'string'
      ? req.query.societyId
      : undefined;
  return mcrAccessService.getActorContext(req.user!, societyId);
}

export class McrExpenseCategoryController {
  async list(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const context = await resolveContext(req);
      const items = await mcrExpenseCategoryService.listBySociety(context.societyId);
      sendSuccess(res, items, 'Expense categories retrieved');
    } catch (error) { next(error); }
  }

  async create(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const context = await resolveContext(req);
      const category = await mcrExpenseCategoryService.create(context.societyId, req.body, context.user.userId);
      sendCreated(res, category, 'Expense category created');
    } catch (error) { next(error); }
  }
}

export const mcrExpenseCategoryController = new McrExpenseCategoryController();
