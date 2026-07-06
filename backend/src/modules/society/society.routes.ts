import { Router } from 'express';
import { authenticate, requirePermission } from '../../common/middleware/auth';
import { societyController } from './society.controller';
import { PERMISSIONS } from '../../config/constants';

const router: Router = Router();

router.use(authenticate);

router.get('/stats', requirePermission(PERMISSIONS.SOCIETY_READ), societyController.getStats.bind(societyController));
router.get('/', requirePermission(PERMISSIONS.SOCIETY_READ), societyController.findAll.bind(societyController));
router.post('/', requirePermission(PERMISSIONS.SOCIETY_CREATE), societyController.create.bind(societyController));
router.get('/:id', requirePermission(PERMISSIONS.SOCIETY_READ), societyController.findById.bind(societyController));
router.patch('/:id', requirePermission(PERMISSIONS.SOCIETY_UPDATE), societyController.update.bind(societyController));

export default router;
