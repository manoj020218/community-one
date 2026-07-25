import { Router } from 'express';
import { authenticate, requirePermission } from '../../common/middleware/auth';
import { PERMISSIONS } from '../../config/constants';
import { communicationController } from './communication.controller';

const router: Router = Router();

router.use(authenticate);
router.use(requirePermission(PERMISSIONS.COMMUNICATION_SETTINGS_MANAGE));

router.get('/settings', communicationController.getSettings.bind(communicationController));
router.patch('/settings/smtp', communicationController.updateSmtp.bind(communicationController));
router.post('/settings/smtp/test', communicationController.testSmtp.bind(communicationController));
router.post('/whatsapp/connect', communicationController.connectWhatsapp.bind(communicationController));
router.get('/whatsapp/status', communicationController.getWhatsappStatus.bind(communicationController));
router.post('/whatsapp/disconnect', communicationController.disconnectWhatsapp.bind(communicationController));

export default router;
