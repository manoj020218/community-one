import { NextFunction, Response } from 'express';
import { AuthenticatedRequest } from '../../common/types';
import { sendCreated, sendPaginated, sendSuccess } from '../../common/utils/response';
import { auditService } from '../audit/audit.service';
import { samaAccessService } from './sama.access.service';
import { householdRateCardService } from './householdRateCard.service';

export class HouseholdRateCardController {
  async list(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const context = await samaAccessService.getActorContext(req.user!, typeof req.query.societyId === 'string' ? req.query.societyId : undefined);
      sendPaginated(res, await householdRateCardService.listForActor(context, req.query), 'SAMA household rate cards retrieved');
    } catch (error) {
      next(error);
    }
  }

  async create(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const context = await samaAccessService.getActorContext(req.user!, typeof req.body.societyId === 'string' ? req.body.societyId : undefined);
      const rateCard = await householdRateCardService.create(context, req.body);
      await auditService.log({ societyId: context.societyId, actorUserId: context.user.userId, actorRole: context.user.roleCode, moduleCode: 'SAMA', action: 'SAMA_HOUSEHOLD_RATE_CARD_CREATED', entityType: 'HouseholdRateCard', entityId: rateCard._id!.toString(), newValue: { associationId: rateCard.associationId, monthlyRatePaise: rateCard.monthlyRatePaise }, ipAddress: req.ip });
      sendCreated(res, rateCard, 'SAMA household rate card created');
    } catch (error) {
      next(error);
    }
  }

  async update(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const context = await samaAccessService.getActorContext(req.user!, typeof req.body.societyId === 'string' ? req.body.societyId : undefined);
      sendSuccess(res, await householdRateCardService.update(context, req.params.rateCardId, req.body), 'SAMA household rate card updated');
    } catch (error) {
      next(error);
    }
  }
}

export const householdRateCardController = new HouseholdRateCardController();
