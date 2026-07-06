import { Router } from 'express';
import { authenticate, requirePermission } from '../../common/middleware/auth';
import { towerController } from './tower.controller';
import { PERMISSIONS } from '../../config/constants';

const router: Router = Router();
router.use(authenticate);

router.get('/society/:societyId', requirePermission(PERMISSIONS.TOWER_READ), towerController.findBySociety.bind(towerController));
router.post('/generate', requirePermission(PERMISSIONS.TOWER_CREATE), towerController.generate.bind(towerController));
router.post('/', requirePermission(PERMISSIONS.TOWER_CREATE), towerController.create.bind(towerController));
router.get('/:id', requirePermission(PERMISSIONS.TOWER_READ), towerController.findById.bind(towerController));
router.patch('/:id', requirePermission(PERMISSIONS.TOWER_UPDATE), towerController.update.bind(towerController));
router.delete('/:id', requirePermission(PERMISSIONS.TOWER_DELETE), towerController.delete.bind(towerController));

export default router;
