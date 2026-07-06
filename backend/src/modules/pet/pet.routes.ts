import { Router } from 'express';
import { authenticate, requirePermission } from '../../common/middleware/auth';
import { petController } from './pet.controller';
import { PERMISSIONS } from '../../config/constants';

const router: Router = Router();
router.use(authenticate);

router.get('/society/:societyId', requirePermission(PERMISSIONS.PET_READ), petController.findBySociety.bind(petController));
router.get('/flat/:flatId', requirePermission(PERMISSIONS.PET_READ), petController.findByFlat.bind(petController));
router.post('/', requirePermission(PERMISSIONS.PET_CREATE), petController.create.bind(petController));
router.get('/:id', requirePermission(PERMISSIONS.PET_READ), petController.findById.bind(petController));
router.patch('/:id', requirePermission(PERMISSIONS.PET_UPDATE), petController.update.bind(petController));
router.patch('/:id/disable', requirePermission(PERMISSIONS.PET_DISABLE), petController.disable.bind(petController));

export default router;
