import { Router } from 'express';
import { authenticate, requirePermission } from '../../common/middleware/auth';
import { roleController } from './role.controller';
import { PERMISSIONS } from '../../config/constants';

const router: Router = Router();

router.use(authenticate);

router.get('/', requirePermission(PERMISSIONS.ROLE_READ), roleController.findAll.bind(roleController));
router.post('/', requirePermission(PERMISSIONS.ROLE_CREATE), roleController.create.bind(roleController));
router.get('/:id', requirePermission(PERMISSIONS.ROLE_READ), roleController.findById.bind(roleController));
router.patch('/:id', requirePermission(PERMISSIONS.ROLE_UPDATE), roleController.update.bind(roleController));

export default router;
