import { NextFunction, Response } from 'express';
import { AuthenticatedRequest } from '../../common/types';
import { sendCreated, sendSuccess } from '../../common/utils/response';
import { auditService } from '../audit/audit.service';
import { McrActorContext, mcrAccessService } from './mcr.access.service';
import { mcrPaymentLifecycleService } from './mcrPaymentLifecycle.service';
import { mcrPaymentService } from './mcrPayment.service';
import { mcrPaymentVerificationService } from './mcrPaymentVerification.service';

function resolveContext(req: AuthenticatedRequest): Promise<McrActorContext> {
  const societyId = typeof req.body.societyId === 'string'
    ? req.body.societyId
    : typeof req.query.societyId === 'string'
      ? req.query.societyId
      : undefined;
  return mcrAccessService.getActorContext(req.user!, societyId);
}

export class McrPaymentController {
  async list(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const context = await resolveContext(req);
      const items = await mcrPaymentService.listBySociety(context.societyId, req.query.status as string | undefined);
      sendSuccess(res, items, 'MCR payments retrieved');
    } catch (error) {
      next(error);
    }
  }

  async getById(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const context = await resolveContext(req);
      const payment = await mcrPaymentService.findById(context.societyId, req.params.paymentId);
      sendSuccess(res, payment, 'MCR payment retrieved');
    } catch (error) {
      next(error);
    }
  }

  async create(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const context = await resolveContext(req);
      const payment = await mcrPaymentService.createManualPayment(context, req.body);
      await auditService.log({
        societyId: context.societyId,
        actorUserId: context.user.userId,
        actorRole: context.user.roleCode,
        moduleCode: 'MCR',
        action: 'MCR_PAYMENT_RECORDED',
        entityType: 'McrPaymentRecord',
        entityId: payment._id!.toString(),
        newValue: { paymentNumber: payment.paymentNumber, amountPaise: payment.amountPaise, status: payment.status },
        ipAddress: req.ip,
      });
      sendCreated(res, payment, 'MCR payment recorded');
    } catch (error) {
      next(error);
    }
  }

  async verify(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const context = await resolveContext(req);
      const result = await mcrPaymentVerificationService.verifyPayment(context, req.params.paymentId, req.body);
      await auditService.log({
        societyId: context.societyId,
        actorUserId: context.user.userId,
        actorRole: context.user.roleCode,
        moduleCode: 'MCR',
        action: 'MCR_PAYMENT_VERIFIED',
        entityType: 'McrPaymentRecord',
        entityId: result.payment._id!.toString(),
        newValue: { paymentNumber: result.payment.paymentNumber, receiptNumber: result.receipt.receiptNumber, status: result.payment.status },
        ipAddress: req.ip,
      });
      sendSuccess(res, result, 'MCR payment verified');
    } catch (error) {
      next(error);
    }
  }

  async reject(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const context = await resolveContext(req);
      const payment = await mcrPaymentVerificationService.rejectPayment(context, req.params.paymentId, req.body);
      await auditService.log({
        societyId: context.societyId,
        actorUserId: context.user.userId,
        actorRole: context.user.roleCode,
        moduleCode: 'MCR',
        action: 'MCR_PAYMENT_REJECTED',
        entityType: 'McrPaymentRecord',
        entityId: payment._id!.toString(),
        newValue: { paymentNumber: payment.paymentNumber, status: payment.status, reason: payment.rejectionReason },
        ipAddress: req.ip,
      });
      sendSuccess(res, payment, 'MCR payment rejected');
    } catch (error) {
      next(error);
    }
  }

  async cancel(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const context = await resolveContext(req);
      const payment = await mcrPaymentLifecycleService.cancelPayment(context, req.params.paymentId, req.body);
      await auditService.log({
        societyId: context.societyId,
        actorUserId: context.user.userId,
        actorRole: context.user.roleCode,
        moduleCode: 'MCR',
        action: 'MCR_PAYMENT_CANCELLED',
        entityType: 'McrPaymentRecord',
        entityId: payment._id!.toString(),
        newValue: { paymentNumber: payment.paymentNumber, status: payment.status, reason: payment.cancellationReason },
        ipAddress: req.ip,
      });
      sendSuccess(res, payment, 'MCR payment cancelled');
    } catch (error) {
      next(error);
    }
  }

  async bounce(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const context = await resolveContext(req);
      const result = await mcrPaymentLifecycleService.bouncePayment(context, req.params.paymentId, req.body);
      await auditService.log({
        societyId: context.societyId,
        actorUserId: context.user.userId,
        actorRole: context.user.roleCode,
        moduleCode: 'MCR',
        action: 'MCR_PAYMENT_BOUNCED',
        entityType: 'McrPaymentRecord',
        entityId: result.payment._id!.toString(),
        newValue: { paymentNumber: result.payment.paymentNumber, status: result.payment.status, reason: result.payment.bounceReason },
        ipAddress: req.ip,
      });
      sendSuccess(res, result, 'MCR payment bounced');
    } catch (error) {
      next(error);
    }
  }
}

export const mcrPaymentController = new McrPaymentController();
