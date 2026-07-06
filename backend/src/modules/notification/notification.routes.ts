import { Router } from 'express';
import { authenticate, requirePermission } from '../../common/middleware/auth';
import { notificationController } from './notification.controller';
import { PERMISSIONS } from '../../config/constants';

const router: Router = Router();
router.use(authenticate);
router.use(requirePermission(PERMISSIONS.NOTIFICATION_READ));

router.get('/', notificationController.getMyNotifications.bind(notificationController));
router.get('/unread-count', notificationController.getUnreadCount.bind(notificationController));
router.patch('/:id/read', notificationController.markRead.bind(notificationController));
router.patch('/mark-all-read', notificationController.markAllRead.bind(notificationController));

export default router;
