import { NextFunction, Response } from 'express';
import { AuthenticatedRequest } from '../../common/types';
import { assertSocietyAccess } from '../../common/utils/authScope';
import { sendCreated, sendSuccess } from '../../common/utils/response';
import { accessPolicyService } from './accessPolicy.service';
import { createPolicySchema, parseAccessInput, updatePolicySchema } from './access-control.validator';

export class AccessPolicyController {
  async listBySociety(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      assertSocietyAccess(req.user!, req.params.societyId);
      const status = typeof req.query.status === 'string' ? req.query.status : undefined;
      const policies = await accessPolicyService.listBySociety(req.params.societyId, status);
      sendSuccess(res, policies, 'Access policies retrieved');
    } catch (error) {
      next(error);
    }
  }

  async create(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const dto = parseAccessInput(createPolicySchema, req.body);
      assertSocietyAccess(req.user!, dto.societyId);
      const policy = await accessPolicyService.create(dto, req.user!.userId);
      sendCreated(res, policy, 'Access policy created');
    } catch (error) {
      next(error);
    }
  }

  async update(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const existing = await accessPolicyService.findById(req.params.id);
      assertSocietyAccess(req.user!, existing.societyId.toString());
      const dto = parseAccessInput(updatePolicySchema, req.body);
      const policy = await accessPolicyService.update(req.params.id, dto);
      sendSuccess(res, policy, 'Access policy updated');
    } catch (error) {
      next(error);
    }
  }
}

export const accessPolicyController = new AccessPolicyController();
