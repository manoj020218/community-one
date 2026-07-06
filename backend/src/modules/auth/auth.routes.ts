import { Router } from 'express';
import { authController } from './auth.controller';
import { authenticate } from '../../common/middleware/auth';
import { authRateLimiter } from '../../common/middleware/rateLimiter';

const router: Router = Router();

router.post('/login', authRateLimiter, authController.login.bind(authController));
router.post('/refresh', authController.refresh.bind(authController));
router.post('/logout', authenticate, authController.logout.bind(authController));
router.post('/change-password', authenticate, authController.changePassword.bind(authController));

export default router;
