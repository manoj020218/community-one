import { Router } from 'express';
import { authenticate, requirePermission, requireSocietyAccess, requireResourceSocietyAccess } from '../../common/middleware/auth';
import { towerController } from './tower.controller';
import { Tower } from './tower.model';
import { PERMISSIONS } from '../../config/constants';

const router: Router = Router();
router.use(authenticate);

router.get('/society/:societyId', requirePermission(PERMISSIONS.TOWER_READ), requireSocietyAccess, towerController.findBySociety.bind(towerController));
router.post('/generate', requirePermission(PERMISSIONS.TOWER_CREATE), requireSocietyAccess, towerController.generate.bind(towerController));
router.post('/', requirePermission(PERMISSIONS.TOWER_CREATE), requireSocietyAccess, towerController.create.bind(towerController));
router.get('/:id', requirePermission(PERMISSIONS.TOWER_READ), requireResourceSocietyAccess(Tower), towerController.findById.bind(towerController));
router.patch('/:id', requirePermission(PERMISSIONS.TOWER_UPDATE), requireResourceSocietyAccess(Tower), towerController.update.bind(towerController));
router.delete('/:id', requirePermission(PERMISSIONS.TOWER_DELETE), requireResourceSocietyAccess(Tower), towerController.delete.bind(towerController));

export default router;
