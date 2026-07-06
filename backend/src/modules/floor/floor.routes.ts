import { Router } from 'express';
import { authenticate, requirePermission } from '../../common/middleware/auth';
import { floorController } from './floor.controller';
import { PERMISSIONS } from '../../config/constants';

const router: Router = Router();
router.use(authenticate);

router.get('/tower/:towerId', requirePermission(PERMISSIONS.FLAT_READ), floorController.findByTower.bind(floorController));
router.get('/society/:societyId', requirePermission(PERMISSIONS.FLAT_READ), floorController.findBySociety.bind(floorController));
router.post('/generate', requirePermission(PERMISSIONS.FLAT_CREATE), floorController.generate.bind(floorController));
router.post('/', requirePermission(PERMISSIONS.FLAT_CREATE), floorController.create.bind(floorController));
router.patch('/:id', requirePermission(PERMISSIONS.FLAT_UPDATE), floorController.update.bind(floorController));
router.delete('/:id', requirePermission(PERMISSIONS.FLAT_DELETE), floorController.delete.bind(floorController));

export default router;
