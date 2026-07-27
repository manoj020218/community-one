import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../../common/types';
import { sendSuccess } from '../../common/utils/response';
import { MODULE_CODES } from '../../config/constants';
import { mcrAccessService } from './mcr.access.service';

function extractMcrPermissions(permissions: string[]): string[] {
  return permissions.filter((permission) => permission.startsWith('mcr.'));
}

export class McrController {
  async getContext(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const explicitSocietyId = typeof req.query.societyId === 'string' ? req.query.societyId : undefined;
      const context = await mcrAccessService.getActorContext(req.user!, explicitSocietyId);
      sendSuccess(res, {
        moduleCode: MODULE_CODES.MCR,
        societyId: context.societyId,
        enabled: true,
        permissions: extractMcrPermissions(context.user.permissions || []),
        routePrefix: '/mcr',
        apiPrefix: '/api/mcr',
      }, 'MCR context retrieved');
    } catch (error) {
      next(error);
    }
  }
}

export const mcrController = new McrController();
