import { Router } from 'express';
import { authenticate, requirePermission, requireSocietyAccess } from '../../common/middleware/auth';
import { moduleRegistryController } from './moduleRegistry.controller';
import { PERMISSIONS } from '../../config/constants';

const router: Router = Router();
router.use(authenticate);

router.get('/', requirePermission(PERMISSIONS.MODULE_READ), moduleRegistryController.getAllModules.bind(moduleRegistryController));
router.get('/society/:societyId', requirePermission(PERMISSIONS.MODULE_READ), requireSocietyAccess, moduleRegistryController.getSocietyModules.bind(moduleRegistryController));
router.post('/society/:societyId/enable/:moduleCode', requirePermission(PERMISSIONS.MODULE_ENABLE), requireSocietyAccess, moduleRegistryController.enableModule.bind(moduleRegistryController));
router.post('/society/:societyId/disable/:moduleCode', requirePermission(PERMISSIONS.MODULE_DISABLE), requireSocietyAccess, moduleRegistryController.disableModule.bind(moduleRegistryController));

export default router;
