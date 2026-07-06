import { Router } from 'express';
import { authenticate, requirePermission } from '../../common/middleware/auth';
import { deviceController } from './device.controller';
import { PERMISSIONS } from '../../config/constants';

const router: Router = Router();

// Heartbeat is public but uses device API key
router.post('/:id/heartbeat', deviceController.heartbeat.bind(deviceController));

router.use(authenticate);
router.get('/society/:societyId', requirePermission(PERMISSIONS.DEVICE_READ), deviceController.findBySociety.bind(deviceController));
router.post('/', requirePermission(PERMISSIONS.DEVICE_CREATE), deviceController.create.bind(deviceController));
router.get('/:id', requirePermission(PERMISSIONS.DEVICE_READ), deviceController.findById.bind(deviceController));
router.patch('/:id', requirePermission(PERMISSIONS.DEVICE_UPDATE), deviceController.update.bind(deviceController));
router.patch('/:id/disable', requirePermission(PERMISSIONS.DEVICE_DISABLE), deviceController.disable.bind(deviceController));

export default router;
