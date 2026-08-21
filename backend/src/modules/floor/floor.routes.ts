import { Router } from 'express';
import { authenticate, requirePermission, requireSocietyAccess, requireResourceSocietyAccess } from '../../common/middleware/auth';
import { floorController } from './floor.controller';
import { Floor } from './floor.model';
import { Tower } from '../tower/tower.model';
import { PERMISSIONS } from '../../config/constants';

const router: Router = Router();
router.use(authenticate);

router.get('/tower/:towerId', requirePermission(PERMISSIONS.FLAT_READ), requireResourceSocietyAccess(Tower, 'towerId'), floorController.findByTower.bind(floorController));
router.get('/society/:societyId', requirePermission(PERMISSIONS.FLAT_READ), requireSocietyAccess, floorController.findBySociety.bind(floorController));
router.post('/generate', requirePermission(PERMISSIONS.FLAT_CREATE), requireSocietyAccess, floorController.generate.bind(floorController));
router.post('/', requirePermission(PERMISSIONS.FLAT_CREATE), requireSocietyAccess, floorController.create.bind(floorController));
router.patch('/:id', requirePermission(PERMISSIONS.FLAT_UPDATE), requireResourceSocietyAccess(Floor), floorController.update.bind(floorController));
router.delete('/:id', requirePermission(PERMISSIONS.FLAT_DELETE), requireResourceSocietyAccess(Floor), floorController.delete.bind(floorController));

export default router;
