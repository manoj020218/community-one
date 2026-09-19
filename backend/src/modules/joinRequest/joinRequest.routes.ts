import { Router } from 'express';
import { authenticate, requirePermission, requireSocietyAccess, requireResourceSocietyAccess } from '../../common/middleware/auth';
import { authRateLimiter } from '../../common/middleware/rateLimiter';
import { joinRequestController } from './joinRequest.controller';
import { JoinRequest } from './joinRequest.model';
import { PERMISSIONS } from '../../config/constants';

const router: Router = Router();

// Public — a member hasn't logged in yet, that's the whole point. Rate-limited the same
// as /auth/login to keep this from being a code-guessing or spam vector.
router.post('/lookup-society', authRateLimiter, joinRequestController.lookupSociety.bind(joinRequestController));
router.post('/', authRateLimiter, joinRequestController.submit.bind(joinRequestController));

// Admin review queue
router.get('/society/:societyId', authenticate, requirePermission(PERMISSIONS.RESIDENT_JOIN_REVIEW), requireSocietyAccess, joinRequestController.findBySociety.bind(joinRequestController));
router.post('/:id/approve', authenticate, requirePermission(PERMISSIONS.RESIDENT_JOIN_REVIEW), requireResourceSocietyAccess(JoinRequest), joinRequestController.approve.bind(joinRequestController));
router.post('/:id/reject', authenticate, requirePermission(PERMISSIONS.RESIDENT_JOIN_REVIEW), requireResourceSocietyAccess(JoinRequest), joinRequestController.reject.bind(joinRequestController));

export default router;
