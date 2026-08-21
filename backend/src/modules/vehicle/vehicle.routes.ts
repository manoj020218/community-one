import { Router } from 'express';
import { authenticate, requirePermission, requireSocietyAccess, requireResourceSocietyAccess } from '../../common/middleware/auth';
import { vehicleController } from './vehicle.controller';
import { Vehicle } from './vehicle.model';
import { Flat } from '../flat/flat.model';
import { PERMISSIONS } from '../../config/constants';

const router: Router = Router();
router.use(authenticate);

router.get('/society/:societyId', requirePermission(PERMISSIONS.VEHICLE_READ), requireSocietyAccess, vehicleController.findBySociety.bind(vehicleController));
router.get('/flat/:flatId', requirePermission(PERMISSIONS.VEHICLE_READ), requireResourceSocietyAccess(Flat, 'flatId'), vehicleController.findByFlat.bind(vehicleController));
router.post('/', requirePermission(PERMISSIONS.VEHICLE_CREATE), requireSocietyAccess, vehicleController.create.bind(vehicleController));
router.get('/:id', requirePermission(PERMISSIONS.VEHICLE_READ), requireResourceSocietyAccess(Vehicle), vehicleController.findById.bind(vehicleController));
router.patch('/:id', requirePermission(PERMISSIONS.VEHICLE_UPDATE), requireResourceSocietyAccess(Vehicle), vehicleController.update.bind(vehicleController));
router.patch('/:id/disable', requirePermission(PERMISSIONS.VEHICLE_DISABLE), requireResourceSocietyAccess(Vehicle), vehicleController.disable.bind(vehicleController));

export default router;
