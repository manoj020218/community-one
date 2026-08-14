import { Router } from 'express';
import { authenticate, requirePermission } from '../../common/middleware/auth';
import { deviceController } from './device.controller';
import { PERMISSIONS } from '../../config/constants';

const router: Router = Router();

// Heartbeat is public but uses device API key
router.post('/:id/heartbeat', deviceController.heartbeat.bind(deviceController));

// Device event push — public, identified purely by the apiKey path segment (not a header) since
// terminal firmware "third-party push" settings typically only let you configure a fixed URL.
router.post('/push/:apiKey', deviceController.pushEvent.bind(deviceController));

// Gateway delivers an on-demand-requested photo — same public apiKey-path auth as the push
// endpoint. Never persisted server-side, see photoRequest.store.ts.
router.post('/photo/:apiKey', deviceController.fulfillPhoto.bind(deviceController));

router.use(authenticate);
router.get('/society/:societyId', requirePermission(PERMISSIONS.DEVICE_READ), deviceController.findBySociety.bind(deviceController));
router.get('/:id/event-logs', requirePermission(PERMISSIONS.DEVICE_READ), deviceController.listEventLogs.bind(deviceController));
router.post('/:id/photo-requests', requirePermission(PERMISSIONS.DEVICE_READ), deviceController.requestPhoto.bind(deviceController));
router.get('/photo-requests/:requestId', requirePermission(PERMISSIONS.DEVICE_READ), deviceController.getPhotoRequestStatus.bind(deviceController));
router.post('/', requirePermission(PERMISSIONS.DEVICE_CREATE), deviceController.create.bind(deviceController));
router.get('/:id', requirePermission(PERMISSIONS.DEVICE_READ), deviceController.findById.bind(deviceController));
router.patch('/:id', requirePermission(PERMISSIONS.DEVICE_UPDATE), deviceController.update.bind(deviceController));
router.patch('/:id/disable', requirePermission(PERMISSIONS.DEVICE_DISABLE), deviceController.disable.bind(deviceController));

export default router;
