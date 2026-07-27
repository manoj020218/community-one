import { NextFunction, Response } from 'express';
import { AuthenticatedRequest } from '../../common/types';
import { sendSuccess } from '../../common/utils/response';
import { auditService } from '../audit/audit.service';
import { samaAccessService } from './sama.access.service';
import { samaSourceService } from './samaSource.service';

export class SamaSourceController {
  async get(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const societyId = typeof req.query.societyId === 'string' ? req.query.societyId : undefined;
      const context = await samaAccessService.getActorContext(req.user!, societyId);
      const source = await samaSourceService.getMaskedBySociety(context.societyId);
      sendSuccess(res, source, 'SAMA source retrieved');
    } catch (error) {
      next(error);
    }
  }

  async update(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const societyId = typeof req.body.societyId === 'string' ? req.body.societyId : undefined;
      const context = await samaAccessService.getActorContext(req.user!, societyId);
      const source = await samaSourceService.update(context.user.userId, context.societyId, req.body);
      await auditService.log({
        societyId: context.societyId,
        actorUserId: context.user.userId,
        actorRole: context.user.roleCode,
        moduleCode: 'SAMA',
        action: 'SAMA_SOURCE_UPDATED',
        entityType: 'SamaSource',
        newValue: { baseUrl: source.baseUrl, apiPrefix: source.apiPrefix, hasAccessToken: source.hasAccessToken },
        ipAddress: req.ip,
      });
      sendSuccess(res, source, 'SAMA source updated');
    } catch (error) {
      next(error);
    }
  }
}

export const samaSourceController = new SamaSourceController();
