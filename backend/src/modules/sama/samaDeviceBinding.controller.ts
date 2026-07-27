import { NextFunction, Response } from 'express';
import { AuthenticatedRequest } from '../../common/types';
import { sendCreated, sendPaginated, sendSuccess } from '../../common/utils/response';
import { auditService } from '../audit/audit.service';
import { samaAccessService } from './sama.access.service';
import { samaDeviceBindingService } from './samaDeviceBinding.service';

export class SamaDeviceBindingController {
  async list(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const context = await samaAccessService.getActorContext(req.user!, typeof req.query.societyId === 'string' ? req.query.societyId : undefined);
      sendPaginated(res, await samaDeviceBindingService.listBySociety(context.societyId, req.query), 'SAMA device bindings retrieved');
    } catch (error) {
      next(error);
    }
  }

  async listExternal(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const context = await samaAccessService.getActorContext(req.user!, typeof req.query.societyId === 'string' ? req.query.societyId : undefined);
      sendSuccess(res, await samaDeviceBindingService.listExternalDevices(context.societyId), 'SAMA external devices retrieved');
    } catch (error) {
      next(error);
    }
  }

  async create(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const context = await samaAccessService.getActorContext(req.user!, typeof req.body.societyId === 'string' ? req.body.societyId : undefined);
      const binding = await samaDeviceBindingService.create(context, req.body);
      await auditService.log({ societyId: context.societyId, actorUserId: context.user.userId, actorRole: context.user.roleCode, moduleCode: 'SAMA', action: 'SAMA_DEVICE_BINDING_CREATED', entityType: 'SamaDeviceBinding', entityId: binding._id!.toString(), newValue: { externalDeviceId: binding.externalDeviceId, jenixDeviceId: binding.jenixDeviceId }, ipAddress: req.ip });
      sendCreated(res, binding, 'SAMA device binding created');
    } catch (error) {
      next(error);
    }
  }

  async update(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const context = await samaAccessService.getActorContext(req.user!, typeof req.body.societyId === 'string' ? req.body.societyId : undefined);
      sendSuccess(res, await samaDeviceBindingService.update(context, req.params.bindingId, req.body), 'SAMA device binding updated');
    } catch (error) {
      next(error);
    }
  }
}

export const samaDeviceBindingController = new SamaDeviceBindingController();
