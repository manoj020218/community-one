import { Router } from 'express';
import { authenticate, requirePermission } from '../../common/middleware/auth';
import { auditController } from './audit.controller';
import { PERMISSIONS } from '../../config/constants';

const router: Router = Router();

router.use(authenticate);
router.use(requirePermission(PERMISSIONS.AUDIT_READ));

router.get('/', auditController.getAll.bind(auditController));
router.get('/society/:societyId', auditController.getBySociety.bind(auditController));

export default router;
