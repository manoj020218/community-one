import { Router } from 'express';
import { authenticate, requirePermission } from '../../common/middleware/auth';
import { PERMISSIONS } from '../../config/constants';
import { notificationController } from './notification.controller';

const router: Router = Router();

router.use(authenticate);
router.post('/device-tokens', notificationController.registerDeviceToken.bind(notificationController));
router.post('/device-tokens/unregister', notificationController.unregisterDeviceToken.bind(notificationController));
router.use(requirePermission(PERMISSIONS.NOTIFICATION_READ));
router.get('/', notificationController.getMyNotifications.bind(notificationController));
router.get('/unread-count', notificationController.getUnreadCount.bind(notificationController));
router.patch('/:id/read', notificationController.markRead.bind(notificationController));
router.patch('/mark-all-read', notificationController.markAllRead.bind(notificationController));

export default router;
