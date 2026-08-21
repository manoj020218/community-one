import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../../common/types';
import { sendCreated, sendSuccess } from '../../common/utils/response';
import { auditService } from '../audit/audit.service';
import { billingPlanService } from './billingPlan.service';
import { mcrAccessService } from './mcr.access.service';

export class BillingPlanController {
  async list(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const societyId = typeof req.query.societyId === 'string' ? req.query.societyId : undefined;
      const context = await mcrAccessService.getActorContext(req.user!, societyId);
      const items = await billingPlanService.listBySociety(context.societyId);
      sendSuccess(res, items, 'MCR billing plans retrieved');
    } catch (error) {
      next(error);
    }
  }

  async create(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const societyId = typeof req.body.societyId === 'string' ? req.body.societyId : undefined;
      const context = await mcrAccessService.getActorContext(req.user!, societyId);
      const billingPlan = await billingPlanService.create(context, req.body);
      await auditService.log({
        societyId: context.societyId,
        actorUserId: context.user.userId,
        actorRole: context.user.roleCode,
        moduleCode: 'MCR',
        action: 'MCR_BILLING_PLAN_CREATED',
        entityType: 'BillingPlan',
        entityId: billingPlan._id!.toString(),
        newValue: { name: billingPlan.name, frequency: billingPlan.frequency },
        ipAddress: req.ip,
      });
      sendCreated(res, billingPlan, 'MCR billing plan created');
    } catch (error) {
      next(error);
    }
  }

  async update(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const societyId = typeof req.body.societyId === 'string' ? req.body.societyId : undefined;
      const context = await mcrAccessService.getActorContext(req.user!, societyId);
      const billingPlan = await billingPlanService.update(context, req.params.id, req.body);
      await auditService.log({
        societyId: context.societyId,
        actorUserId: context.user.userId,
        actorRole: context.user.roleCode,
        moduleCode: 'MCR',
        action: 'MCR_BILLING_PLAN_UPDATED',
        entityType: 'BillingPlan',
        entityId: billingPlan._id!.toString(),
        newValue: req.body,
        ipAddress: req.ip,
      });
      sendSuccess(res, billingPlan, 'MCR billing plan updated');
    } catch (error) {
      next(error);
    }
  }
}

export const billingPlanController = new BillingPlanController();
