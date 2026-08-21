import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../../common/types';
import { sendCreated, sendSuccess } from '../../common/utils/response';
import { auditService } from '../audit/audit.service';
import { chargeHeadService } from './chargeHead.service';
import { mcrAccessService } from './mcr.access.service';

export class ChargeHeadController {
  async list(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const societyId = typeof req.query.societyId === 'string' ? req.query.societyId : undefined;
      const context = await mcrAccessService.getActorContext(req.user!, societyId);
      const items = await chargeHeadService.listBySociety(context.societyId);
      sendSuccess(res, items, 'MCR charge heads retrieved');
    } catch (error) {
      next(error);
    }
  }

  async create(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const societyId = typeof req.body.societyId === 'string' ? req.body.societyId : undefined;
      const context = await mcrAccessService.getActorContext(req.user!, societyId);
      const chargeHead = await chargeHeadService.create(context, req.body);
      await auditService.log({
        societyId: context.societyId,
        actorUserId: context.user.userId,
        actorRole: context.user.roleCode,
        moduleCode: 'MCR',
        action: 'MCR_CHARGE_HEAD_CREATED',
        entityType: 'ChargeHead',
        entityId: chargeHead._id!.toString(),
        newValue: { code: chargeHead.code, name: chargeHead.name },
        ipAddress: req.ip,
      });
      sendCreated(res, chargeHead, 'MCR charge head created');
    } catch (error) {
      next(error);
    }
  }

  async update(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const societyId = typeof req.body.societyId === 'string' ? req.body.societyId : undefined;
      const context = await mcrAccessService.getActorContext(req.user!, societyId);
      const chargeHead = await chargeHeadService.update(context, req.params.id, req.body);
      await auditService.log({
        societyId: context.societyId,
        actorUserId: context.user.userId,
        actorRole: context.user.roleCode,
        moduleCode: 'MCR',
        action: 'MCR_CHARGE_HEAD_UPDATED',
        entityType: 'ChargeHead',
        entityId: chargeHead._id!.toString(),
        newValue: req.body,
        ipAddress: req.ip,
      });
      sendSuccess(res, chargeHead, 'MCR charge head updated');
    } catch (error) {
      next(error);
    }
  }
}

export const chargeHeadController = new ChargeHeadController();
