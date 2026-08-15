import { NextFunction, Response } from 'express';
import { AuthenticatedRequest } from '../../common/types';
import { assertSocietyAccess } from '../../common/utils/authScope';
import { sendCreated, sendSuccess } from '../../common/utils/response';
import { accessCredentialService } from './accessCredential.service';
import { createCredentialSchema, parseAccessInput } from './access-control.validator';

export class AccessCredentialController {
  async listBySociety(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      assertSocietyAccess(req.user!, req.params.societyId);
      const credentials = await accessCredentialService.listBySociety(req.params.societyId);
      sendSuccess(res, credentials, 'Access credentials retrieved');
    } catch (error) {
      next(error);
    }
  }

  async create(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const dto = parseAccessInput(createCredentialSchema, req.body);
      assertSocietyAccess(req.user!, dto.societyId);
      const credential = await accessCredentialService.create(dto, req.user!.userId);
      sendCreated(res, credential, 'Access credential created');
    } catch (error) {
      next(error);
    }
  }

  async revoke(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const existing = await accessCredentialService.findById(req.params.id);
      assertSocietyAccess(req.user!, existing.societyId.toString());
      const credential = await accessCredentialService.revoke(req.params.id);
      sendSuccess(res, credential, 'Access credential revoked');
    } catch (error) {
      next(error);
    }
  }
}

export const accessCredentialController = new AccessCredentialController();
