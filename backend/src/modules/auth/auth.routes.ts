import { Router } from 'express';
import { authController } from './auth.controller';
import { authenticate } from '../../common/middleware/auth';
import { authRateLimiter } from '../../common/middleware/rateLimiter';

const router: Router = Router();

router.post('/login', authRateLimiter, authController.login.bind(authController));
router.post('/google', authRateLimiter, authController.googleLogin.bind(authController));
router.post('/onboard-society', authRateLimiter, authController.onboardSociety.bind(authController));
router.post('/refresh', authController.refresh.bind(authController));
router.post('/logout', authenticate, authController.logout.bind(authController));
router.post('/change-password', authenticate, authController.changePassword.bind(authController));
router.post('/google/link', authenticate, authController.linkGoogleAccount.bind(authController));
router.post('/google/unlink', authenticate, authController.unlinkGoogleAccount.bind(authController));

export default router;
