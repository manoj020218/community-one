import { NextFunction, Response } from 'express';
import { AuthenticatedRequest } from '../../common/types';
import { sendSuccess } from '../../common/utils/response';
import { auditService } from '../audit/audit.service';
import { McrActorContext, mcrAccessService } from './mcr.access.service';
import { mcrOpeningBalanceService } from './mcrOpeningBalance.service';

function resolveContext(req: AuthenticatedRequest): Promise<McrActorContext> {
  const societyId = typeof req.body.societyId === 'string'
    ? req.body.societyId
    : typeof req.query.societyId === 'string'
      ? req.query.societyId
      : undefined;
  return mcrAccessService.getActorContext(req.user!, societyId);
}

export class McrOpeningBalanceController {
  async get(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const context = await resolveContext(req);
      const opening = await mcrOpeningBalanceService.getBySociety(context.societyId);
      sendSuccess(res, opening, 'Opening balance retrieved');
    } catch (error) { next(error); }
  }

  async set(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const context = await resolveContext(req);
      const opening = await mcrOpeningBalanceService.setOpeningBalance(context, req.body);
      await auditService.log({
        societyId: context.societyId,
        actorUserId: context.user.userId,
        actorRole: context.user.roleCode,
        moduleCode: 'MCR',
        action: 'MCR_OPENING_BALANCE_SET',
        entityType: 'McrOpeningBalance',
        entityId: opening._id!.toString(),
        newValue: { openingCashPaise: opening.openingCashPaise, openingBankPaise: opening.openingBankPaise, asOfDate: opening.asOfDate },
        ipAddress: req.ip,
      });
      sendSuccess(res, opening, 'Opening balance saved');
    } catch (error) { next(error); }
  }

  async bulkDues(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const context = await resolveContext(req);
      const result = await mcrOpeningBalanceService.bulkCreateOpeningDues(context, req.body);
      await auditService.log({
        societyId: context.societyId,
        actorUserId: context.user.userId,
        actorRole: context.user.roleCode,
        moduleCode: 'MCR',
        action: 'MCR_OPENING_DUES_CREATED',
        entityType: 'MaintenanceDemand',
        newValue: { createdCount: result.createdCount, skippedCount: result.skippedCount },
        ipAddress: req.ip,
      });
      sendSuccess(res, result, 'Opening dues created');
    } catch (error) { next(error); }
  }
}

export const mcrOpeningBalanceController = new McrOpeningBalanceController();
