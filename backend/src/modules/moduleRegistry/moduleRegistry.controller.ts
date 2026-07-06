import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../../common/types';
import { moduleRegistryService } from './moduleRegistry.service';
import { sendSuccess } from '../../common/utils/response';
import { auditService } from '../audit/audit.service';

export class ModuleRegistryController {
  async getAllModules(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const modules = await moduleRegistryService.getAllModules();
      sendSuccess(res, modules, 'Modules retrieved');
    } catch (error) { next(error); }
  }

  async getSocietyModules(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const modules = await moduleRegistryService.getSocietyModules(req.params.societyId);
      sendSuccess(res, modules, 'Society modules retrieved');
    } catch (error) { next(error); }
  }

  async enableModule(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { societyId, moduleCode } = req.params;
      const config = await moduleRegistryService.enableModule(societyId, moduleCode, req.user!.userId);
      await auditService.log({
        societyId, actorUserId: req.user!.userId, actorRole: req.user!.roleCode,
        moduleCode: 'CORE', action: 'MODULE_ENABLED', entityType: 'Module',
        entityId: moduleCode, newValue: { moduleCode }, ipAddress: req.ip,
      });
      sendSuccess(res, config, `Module ${moduleCode} enabled`);
    } catch (error) { next(error); }
  }

  async disableModule(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { societyId, moduleCode } = req.params;
      const config = await moduleRegistryService.disableModule(societyId, moduleCode);
      await auditService.log({
        societyId, actorUserId: req.user!.userId, actorRole: req.user!.roleCode,
        moduleCode: 'CORE', action: 'MODULE_DISABLED', entityType: 'Module',
        entityId: moduleCode, ipAddress: req.ip,
      });
      sendSuccess(res, config, `Module ${moduleCode} disabled`);
    } catch (error) { next(error); }
  }
}

export const moduleRegistryController = new ModuleRegistryController();
