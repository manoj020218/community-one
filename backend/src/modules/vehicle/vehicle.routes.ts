import { Router } from 'express';
import { authenticate, requirePermission } from '../../common/middleware/auth';
import { vehicleController } from './vehicle.controller';
import { PERMISSIONS } from '../../config/constants';

const router: Router = Router();
router.use(authenticate);

router.get('/society/:societyId', requirePermission(PERMISSIONS.VEHICLE_READ), vehicleController.findBySociety.bind(vehicleController));
router.get('/flat/:flatId', requirePermission(PERMISSIONS.VEHICLE_READ), vehicleController.findByFlat.bind(vehicleController));
router.post('/', requirePermission(PERMISSIONS.VEHICLE_CREATE), vehicleController.create.bind(vehicleController));
router.get('/:id', requirePermission(PERMISSIONS.VEHICLE_READ), vehicleController.findById.bind(vehicleController));
router.patch('/:id', requirePermission(PERMISSIONS.VEHICLE_UPDATE), vehicleController.update.bind(vehicleController));
router.patch('/:id/disable', requirePermission(PERMISSIONS.VEHICLE_DISABLE), vehicleController.disable.bind(vehicleController));

export default router;
