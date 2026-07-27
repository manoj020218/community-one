import { NextFunction, Response } from 'express';
import { AuthenticatedRequest } from '../../common/types';
import { sendCreated, sendPaginated, sendSuccess } from '../../common/utils/response';
import { auditService } from '../audit/audit.service';
import { samaAccessService } from './sama.access.service';
import { serviceProviderService } from './serviceProvider.service';

export class ServiceProviderController {
  async list(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const context = await samaAccessService.getActorContext(req.user!, typeof req.query.societyId === 'string' ? req.query.societyId : undefined);
      sendPaginated(res, await serviceProviderService.listBySociety(context.societyId, req.query), 'SAMA service providers retrieved');
    } catch (error) {
      next(error);
    }
  }

  async create(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const context = await samaAccessService.getActorContext(req.user!, typeof req.body.societyId === 'string' ? req.body.societyId : undefined);
      const provider = await serviceProviderService.create(context, req.body);
      await auditService.log({ societyId: context.societyId, actorUserId: context.user.userId, actorRole: context.user.roleCode, moduleCode: 'SAMA', action: 'SAMA_SERVICE_PROVIDER_CREATED', entityType: 'ServiceProviderProfile', entityId: provider._id!.toString(), newValue: { providerCode: provider.providerCode, displayName: provider.displayName }, ipAddress: req.ip });
      sendCreated(res, provider, 'SAMA service provider created');
    } catch (error) {
      next(error);
    }
  }

  async update(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const context = await samaAccessService.getActorContext(req.user!, typeof req.body.societyId === 'string' ? req.body.societyId : undefined);
      sendSuccess(res, await serviceProviderService.update(context, req.params.providerId, req.body), 'SAMA service provider updated');
    } catch (error) {
      next(error);
    }
  }
}

export const serviceProviderController = new ServiceProviderController();
