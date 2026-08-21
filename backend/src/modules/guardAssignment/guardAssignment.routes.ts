import { Router } from 'express';
import { authenticate, requirePermission, requireResourceSocietyAccess } from '../../common/middleware/auth';
import { PERMISSIONS } from '../../config/constants';
import { guardAssignmentController } from './guardAssignment.controller';
import { GuardAssignment } from './guardAssignment.model';

const router: Router = Router();

router.use(authenticate);
router.get('/me', requirePermission(PERMISSIONS.GUARD_ASSIGNMENT_READ), guardAssignmentController.myAssignments.bind(guardAssignmentController));
router.get('/society/:societyId', requirePermission(PERMISSIONS.GUARD_ASSIGNMENT_READ), guardAssignmentController.findBySociety.bind(guardAssignmentController));
router.post('/', requirePermission(PERMISSIONS.GUARD_ASSIGNMENT_MANAGE), guardAssignmentController.create.bind(guardAssignmentController));
router.patch('/:id', requirePermission(PERMISSIONS.GUARD_ASSIGNMENT_MANAGE), requireResourceSocietyAccess(GuardAssignment), guardAssignmentController.update.bind(guardAssignmentController));
router.patch('/:id/disable', requirePermission(PERMISSIONS.GUARD_ASSIGNMENT_MANAGE), requireResourceSocietyAccess(GuardAssignment), guardAssignmentController.disable.bind(guardAssignmentController));

export default router;
