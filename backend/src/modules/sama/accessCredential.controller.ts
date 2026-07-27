import { NextFunction, Response } from 'express';
import { AuthenticatedRequest } from '../../common/types';
import { sendCreated, sendPaginated, sendSuccess } from '../../common/utils/response';
import { auditService } from '../audit/audit.service';
import { samaAccessService } from './sama.access.service';
import { accessCredentialService } from './accessCredential.service';

export class AccessCredentialController {
  async list(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const context = await samaAccessService.getActorContext(req.user!, typeof req.query.societyId === 'string' ? req.query.societyId : undefined);
      sendPaginated(res, await accessCredentialService.listBySociety(context.societyId, req.query), 'SAMA access credentials retrieved');
    } catch (error) {
      next(error);
    }
  }

  async create(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const context = await samaAccessService.getActorContext(req.user!, typeof req.body.societyId === 'string' ? req.body.societyId : undefined);
      const credential = await accessCredentialService.create(context, req.body);
      await auditService.log({ societyId: context.societyId, actorUserId: context.user.userId, actorRole: context.user.roleCode, moduleCode: 'SAMA', action: 'SAMA_ACCESS_CREDENTIAL_CREATED', entityType: 'AccessCredential', entityId: credential._id!.toString(), newValue: { subjectType: credential.subjectType, credentialType: credential.credentialType }, ipAddress: req.ip });
      sendCreated(res, credential, 'SAMA access credential created');
    } catch (error) {
      next(error);
    }
  }

  async revoke(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const context = await samaAccessService.getActorContext(req.user!, typeof req.body.societyId === 'string' ? req.body.societyId : undefined);
      sendSuccess(res, await accessCredentialService.revoke(context, req.params.credentialId), 'SAMA access credential revoked');
    } catch (error) {
      next(error);
    }
  }
}

export const accessCredentialController = new AccessCredentialController();
