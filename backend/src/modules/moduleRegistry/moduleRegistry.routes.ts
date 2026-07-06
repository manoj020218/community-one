import { Router } from 'express';
import { authenticate, requirePermission } from '../../common/middleware/auth';
import { moduleRegistryController } from './moduleRegistry.controller';
import { PERMISSIONS } from '../../config/constants';

const router: Router = Router();
router.use(authenticate);

router.get('/', requirePermission(PERMISSIONS.MODULE_READ), moduleRegistryController.getAllModules.bind(moduleRegistryController));
router.get('/society/:societyId', requirePermission(PERMISSIONS.MODULE_READ), moduleRegistryController.getSocietyModules.bind(moduleRegistryController));
router.post('/society/:societyId/enable/:moduleCode', requirePermission(PERMISSIONS.MODULE_ENABLE), moduleRegistryController.enableModule.bind(moduleRegistryController));
router.post('/society/:societyId/disable/:moduleCode', requirePermission(PERMISSIONS.MODULE_DISABLE), moduleRegistryController.disableModule.bind(moduleRegistryController));

export default router;
