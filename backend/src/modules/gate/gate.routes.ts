import { Router } from 'express';
import { authenticate, requirePermission } from '../../common/middleware/auth';
import { PERMISSIONS } from '../../config/constants';
import { gateController } from './gate.controller';

const router: Router = Router();

router.use(authenticate);
router.get('/legacy-device-mappings', requirePermission(PERMISSIONS.GATE_READ), gateController.previewLegacyMappings.bind(gateController));
router.get('/society/:societyId', requirePermission(PERMISSIONS.GATE_READ), gateController.findBySociety.bind(gateController));
router.post('/', requirePermission(PERMISSIONS.GATE_CREATE), gateController.create.bind(gateController));
router.get('/:id', requirePermission(PERMISSIONS.GATE_READ), gateController.findById.bind(gateController));
router.patch('/:id', requirePermission(PERMISSIONS.GATE_UPDATE), gateController.update.bind(gateController));
router.patch('/:id/disable', requirePermission(PERMISSIONS.GATE_DISABLE), gateController.disable.bind(gateController));
router.post('/:gateId/link-devices', requirePermission(PERMISSIONS.GATE_UPDATE), gateController.linkDevices.bind(gateController));

export default router;
