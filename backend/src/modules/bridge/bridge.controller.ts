import { Request, Response, NextFunction } from 'express';
import { bridgeService } from './bridge.service';
import { auditService } from '../audit/audit.service';
import { sendSuccess } from '../../common/utils/response';
import { ValidationError } from '../../common/errors/AppError';
import { ProvisionSocietyDto } from './bridge.types';

const REQUIRED_FIELDS: (keyof ProvisionSocietyDto)[] = [
  'societyName', 'address', 'city', 'state', 'pincode', 'contactPersonName', 'email', 'mobile',
];

export class BridgeController {
  async provisionSociety(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const dto = req.body as ProvisionSocietyDto;
      const missing = REQUIRED_FIELDS.filter((field) => !dto?.[field]);
      if (missing.length > 0) {
        throw new ValidationError(`Missing required field(s): ${missing.join(', ')}`);
      }

      const { adminUserId, ...result } = await bridgeService.provisionSociety(dto);

      await auditService.log({
        actorUserId: adminUserId,
        actorRole: 'BILLING_PLATFORM',
        moduleCode: 'CORE',
        action: 'CREATE',
        entityType: 'Society',
        entityId: result.societyId,
        ipAddress: req.ip || '',
        userAgent: req.headers['user-agent'] || '',
      });

      sendSuccess(res, result, 'Society provisioned');
    } catch (error) {
      next(error);
    }
  }
}

export const bridgeController = new BridgeController();
