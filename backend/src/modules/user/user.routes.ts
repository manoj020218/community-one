import { Router } from 'express';
import { authenticate, requirePermission } from '../../common/middleware/auth';
import { userController } from './user.controller';
import { PERMISSIONS } from '../../config/constants';

const router: Router = Router();

router.use(authenticate);

router.get('/me', userController.getMe.bind(userController));
router.patch('/me', userController.updateMe.bind(userController));
router.post('/', requirePermission(PERMISSIONS.USER_CREATE), userController.create.bind(userController));
router.get('/society/:societyId', requirePermission(PERMISSIONS.USER_READ), userController.getBySociety.bind(userController));
router.get('/:id', requirePermission(PERMISSIONS.USER_READ), userController.getById.bind(userController));

export default router;
