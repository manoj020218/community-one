import { NextFunction, Response } from 'express';
import { AuthenticatedRequest } from '../../common/types';
import { sendCreated, sendPaginated, sendSuccess } from '../../common/utils/response';
import { auditService } from '../audit/audit.service';
import { samaAccessService } from './sama.access.service';
import { householdPaymentService } from './householdPayment.service';
import { samaNotificationService } from './samaNotification.service';

export class HouseholdPaymentController {
  async list(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const context = await samaAccessService.getActorContext(req.user!, typeof req.query.societyId === 'string' ? req.query.societyId : undefined);
      sendPaginated(res, await householdPaymentService.listForActor(context, req.query), 'SAMA household payments retrieved');
    } catch (error) {
      next(error);
    }
  }

  async create(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const context = await samaAccessService.getActorContext(req.user!, typeof req.body.societyId === 'string' ? req.body.societyId : undefined);
      const payment = await householdPaymentService.create(context, req.body);
      await samaNotificationService.notifyResidentsByFlat(context.societyId, payment.flatId.toString(), { title: 'Household payment recorded', message: `Household staff payment for ${payment.billingMonth} is now ${payment.status.toLowerCase()}.`, actionUrl: `/sama/household-payments`, entityType: 'HouseholdPaymentRecord', entityId: payment._id!.toString(), type: 'PAYMENT' });
      await auditService.log({ societyId: context.societyId, actorUserId: context.user.userId, actorRole: context.user.roleCode, moduleCode: 'SAMA', action: 'SAMA_HOUSEHOLD_PAYMENT_CREATED', entityType: 'HouseholdPaymentRecord', entityId: payment._id!.toString(), newValue: { billingMonth: payment.billingMonth, status: payment.status }, ipAddress: req.ip });
      sendCreated(res, payment, 'SAMA household payment created');
    } catch (error) {
      next(error);
    }
  }

  async update(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const context = await samaAccessService.getActorContext(req.user!, typeof req.body.societyId === 'string' ? req.body.societyId : undefined);
      const payment = await householdPaymentService.update(context, req.params.paymentId, req.body);
      await samaNotificationService.notifyResidentsByFlat(context.societyId, payment.flatId.toString(), { title: 'Household payment updated', message: `Household staff payment for ${payment.billingMonth} is now ${payment.status.toLowerCase()}.`, actionUrl: `/sama/household-payments`, entityType: 'HouseholdPaymentRecord', entityId: payment._id!.toString(), type: 'PAYMENT' });
      sendSuccess(res, payment, 'SAMA household payment updated');
    } catch (error) {
      next(error);
    }
  }
}

export const householdPaymentController = new HouseholdPaymentController();
