import { Router } from 'express';
import { authenticate, requirePermission, requireSocietyAccess, requireRole } from '../../common/middleware/auth';
import { auditController } from './audit.controller';
import { PERMISSIONS } from '../../config/constants';

const router: Router = Router();

router.use(authenticate);
router.use(requirePermission(PERMISSIONS.AUDIT_READ));

// Cross-society audit log — platform staff only. Society admins use /society/:societyId below.
router.get('/', requireRole('JENIX_SUPER_ADMIN', 'JENIX_SUPPORT'), auditController.getAll.bind(auditController));
router.get('/society/:societyId', requireSocietyAccess, auditController.getBySociety.bind(auditController));

export default router;
