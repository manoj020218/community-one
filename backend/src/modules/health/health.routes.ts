import { Router } from 'express';
import { healthController } from './health.controller';

const router: Router = Router();

router.get('/', healthController.check.bind(healthController));
router.get('/logs', healthController.getRecentLogs.bind(healthController));

export default router;
