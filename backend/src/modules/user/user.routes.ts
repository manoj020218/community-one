import { Router } from 'express';
import { authenticate, requirePermission, requireSocietyAccess, requireResourceSocietyAccess } from '../../common/middleware/auth';
import { userController } from './user.controller';
import { User } from './user.model';
import { PERMISSIONS } from '../../config/constants';

const router: Router = Router();

router.use(authenticate);

router.get('/me', userController.getMe.bind(userController));
router.patch('/me', userController.updateMe.bind(userController));
router.post('/', requirePermission(PERMISSIONS.USER_CREATE), requireSocietyAccess, userController.create.bind(userController));
router.get('/society/:societyId', requirePermission(PERMISSIONS.USER_READ), requireSocietyAccess, userController.getBySociety.bind(userController));
router.get('/:id', requirePermission(PERMISSIONS.USER_READ), requireResourceSocietyAccess(User), userController.getById.bind(userController));
router.patch('/:id/link-flat', requirePermission(PERMISSIONS.USER_UPDATE), requireResourceSocietyAccess(User), userController.linkFlat.bind(userController));

export default router;
