import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../../common/types';
import { paymentService } from './payment.service';
import { sendSuccess, sendCreated, sendPaginated, parsePagination } from '../../common/utils/response';
import { auditService } from '../audit/audit.service';

export class PaymentController {
  async create(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const payment = await paymentService.create(req.body, req.user!.userId);
      await auditService.log({ societyId: req.body.societyId, actorUserId: req.user!.userId, actorRole: req.user!.roleCode, moduleCode: 'CORE', action: 'PAYMENT_CREATED', entityType: 'Payment', entityId: payment._id!.toString(), newValue: { amount: payment.amount }, ipAddress: req.ip });
      sendCreated(res, payment, 'Payment recorded');
    } catch (error) { next(error); }
  }

  async findBySociety(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { page, limit } = parsePagination(req.query);
      const result = await paymentService.findBySociety(req.params.societyId, page, limit, req.query.status as string);
      sendPaginated(res, result, 'Payments retrieved');
    } catch (error) { next(error); }
  }

  async getSummary(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const summary = await paymentService.getSummaryBySociety(req.params.societyId);
      sendSuccess(res, summary, 'Payment summary retrieved');
    } catch (error) { next(error); }
  }

  async findById(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const payment = await paymentService.findById(req.params.id);
      sendSuccess(res, payment);
    } catch (error) { next(error); }
  }
}

export const paymentController = new PaymentController();
