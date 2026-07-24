/**
 * Billing bridge routes — server-to-server only, authenticated via X-Bridge-Secret.
 * POST /api/bridge/provision — billing platform provisions a new society + admin user.
 */
import { Router } from 'express';
import { bridgeAuth } from '../../common/middleware/bridgeAuth';
import { bridgeController } from './bridge.controller';

const router: Router = Router();

router.use(bridgeAuth);

router.post('/provision', bridgeController.provisionSociety.bind(bridgeController));

export default router;
