import { Router } from 'express';
import { authenticate, requirePermission } from '../../common/middleware/auth';
import { residentController } from './resident.controller';
import { PERMISSIONS } from '../../config/constants';

const router: Router = Router();
router.use(authenticate);

router.get('/society/:societyId', requirePermission(PERMISSIONS.RESIDENT_READ), residentController.findBySociety.bind(residentController));
router.get('/flat/:flatId', requirePermission(PERMISSIONS.RESIDENT_READ), residentController.findByFlat.bind(residentController));
router.post('/', requirePermission(PERMISSIONS.RESIDENT_CREATE), residentController.create.bind(residentController));
router.get('/:id', requirePermission(PERMISSIONS.RESIDENT_READ), residentController.findById.bind(residentController));
router.patch('/:id/kyc', requirePermission(PERMISSIONS.RESIDENT_UPDATE), residentController.markKyc.bind(residentController));
router.patch('/:id', requirePermission(PERMISSIONS.RESIDENT_UPDATE), residentController.update.bind(residentController));
router.patch('/:id/disable', requirePermission(PERMISSIONS.RESIDENT_DISABLE), residentController.disable.bind(residentController));

export default router;
