import { NextFunction, Response } from 'express';
import { AuthenticatedRequest } from '../../common/types';
import { sendCreated, sendPaginated, sendSuccess } from '../../common/utils/response';
import { auditService } from '../audit/audit.service';
import { samaAccessService } from './sama.access.service';
import { accessPolicyService } from './accessPolicy.service';

export class AccessPolicyController {
  async list(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const context = await samaAccessService.getActorContext(req.user!, typeof req.query.societyId === 'string' ? req.query.societyId : undefined);
      sendPaginated(res, await accessPolicyService.listBySociety(context.societyId, req.query), 'SAMA access policies retrieved');
    } catch (error) {
      next(error);
    }
  }

  async create(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const context = await samaAccessService.getActorContext(req.user!, typeof req.body.societyId === 'string' ? req.body.societyId : undefined);
      const policy = await accessPolicyService.create(context, req.body);
      await auditService.log({ societyId: context.societyId, actorUserId: context.user.userId, actorRole: context.user.roleCode, moduleCode: 'SAMA', action: 'SAMA_ACCESS_POLICY_CREATED', entityType: 'AccessPolicy', entityId: policy._id!.toString(), newValue: { name: policy.name, subjectType: policy.subjectType }, ipAddress: req.ip });
      sendCreated(res, policy, 'SAMA access policy created');
    } catch (error) {
      next(error);
    }
  }

  async update(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const context = await samaAccessService.getActorContext(req.user!, typeof req.body.societyId === 'string' ? req.body.societyId : undefined);
      sendSuccess(res, await accessPolicyService.update(context, req.params.policyId, req.body), 'SAMA access policy updated');
    } catch (error) {
      next(error);
    }
  }
}

export const accessPolicyController = new AccessPolicyController();
