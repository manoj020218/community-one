import { Router } from 'express';
import { authenticate, requirePermission } from '../../common/middleware/auth';
import { flatController } from './flat.controller';
import { PERMISSIONS } from '../../config/constants';

const router: Router = Router();
router.use(authenticate);

router.get('/society/:societyId', requirePermission(PERMISSIONS.FLAT_READ), flatController.findBySociety.bind(flatController));
router.get('/society/:societyId/stats', requirePermission(PERMISSIONS.FLAT_READ), flatController.getStats.bind(flatController));
router.get('/floor/:floorId', requirePermission(PERMISSIONS.FLAT_READ), flatController.findByFloor.bind(flatController));
router.post('/generate', requirePermission(PERMISSIONS.FLAT_CREATE), flatController.generate.bind(flatController));
router.post('/', requirePermission(PERMISSIONS.FLAT_CREATE), flatController.create.bind(flatController));
router.get('/:id', requirePermission(PERMISSIONS.FLAT_READ), flatController.findById.bind(flatController));
router.patch('/:id', requirePermission(PERMISSIONS.FLAT_UPDATE), flatController.update.bind(flatController));
router.delete('/:id', requirePermission(PERMISSIONS.FLAT_DELETE), flatController.delete.bind(flatController));

export default router;
