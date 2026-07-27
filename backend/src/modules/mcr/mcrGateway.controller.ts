import { NextFunction, Request, Response } from 'express';
import { AuthenticatedRequest } from '../../common/types';
import { sendCreated, sendSuccess } from '../../common/utils/response';
import { auditService } from '../audit/audit.service';
import { McrActorContext, mcrAccessService } from './mcr.access.service';
import { mcrGatewayService } from './mcrGateway.service';

function resolveContext(req: AuthenticatedRequest): Promise<McrActorContext> {
  const societyId = typeof req.body.societyId === 'string'
    ? req.body.societyId
    : typeof req.query.societyId === 'string'
      ? req.query.societyId
      : undefined;
  return mcrAccessService.getActorContext(req.user!, societyId);
}

export class McrGatewayController {
  async getConfig(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const context = await resolveContext(req);
      sendSuccess(res, await mcrGatewayService.getConfig(context.societyId), 'MCR gateway config retrieved');
    } catch (error) { next(error); }
  }

  async updateConfig(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const context = await resolveContext(req);
      const config = await mcrGatewayService.updateConfig(context, req.body);
      sendSuccess(res, config, 'MCR gateway config updated');
    } catch (error) { next(error); }
  }

  async createOrder(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const context = await resolveContext(req);
      const order = await mcrGatewayService.createOrder(context, req.body);
      await auditService.log({ societyId: context.societyId, actorUserId: context.user.userId, actorRole: context.user.roleCode, moduleCode: 'MCR', action: 'MCR_GATEWAY_ORDER_CREATED', entityType: 'McrPaymentRecord', entityId: order.paymentId, newValue: order, ipAddress: req.ip });
      sendCreated(res, order, 'MCR gateway order created');
    } catch (error) { next(error); }
  }

  async webhook(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      sendSuccess(res, await mcrGatewayService.processWebhook(req.params.provider, req.headers as Record<string, unknown>, req.body || {}), 'MCR gateway webhook processed');
    } catch (error) { next(error); }
  }
}

export const mcrGatewayController = new McrGatewayController();
