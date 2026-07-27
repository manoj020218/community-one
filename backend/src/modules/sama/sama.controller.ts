import { NextFunction, Response } from 'express';
import { AuthenticatedRequest } from '../../common/types';
import { sendSuccess } from '../../common/utils/response';
import { MODULE_CODES } from '../../config/constants';
import { samaAccessService } from './sama.access.service';

function extractSamaPermissions(permissions: string[]): string[] {
  return permissions.filter((permission) => permission.startsWith('sama.'));
}

export class SamaController {
  async getContext(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const societyId = typeof req.query.societyId === 'string' ? req.query.societyId : undefined;
      const context = await samaAccessService.getActorContext(req.user!, societyId);
      sendSuccess(
        res,
        {
          moduleCode: MODULE_CODES.SAMA,
          societyId: context.societyId,
          enabled: true,
          permissions: extractSamaPermissions(context.user.permissions || []),
          routePrefix: '/sama',
          apiPrefix: '/api/sama',
          provider: 'EDGEFOLIO',
        },
        'SAMA context retrieved'
      );
    } catch (error) {
      next(error);
    }
  }
}

export const samaController = new SamaController();
