import { Router } from 'express';
import { authenticate, requirePermission } from '../../common/middleware/auth';
import { reportController } from './report.controller';
import { PERMISSIONS } from '../../config/constants';

const router: Router = Router();
router.use(authenticate);
router.use(requirePermission(PERMISSIONS.REPORT_READ));

router.get('/definitions', reportController.getDefinitions.bind(reportController));
router.get('/run/:code', reportController.runReport.bind(reportController));

export default router;
