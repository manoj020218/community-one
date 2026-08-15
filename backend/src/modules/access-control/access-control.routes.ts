import { Router } from 'express';
import { authenticate, requirePermission } from '../../common/middleware/auth';
import { PERMISSIONS } from '../../config/constants';
import { zoneController } from './zone.controller';
import { accessCredentialController } from './accessCredential.controller';
import { accessPolicyController } from './accessPolicy.controller';
import { accessEventController } from './accessEvent.controller';

const router: Router = Router();
router.use(authenticate);

// Zones
router.get('/society/:societyId/zones', requirePermission(PERMISSIONS.ACCESS_ZONE_MANAGE), zoneController.listBySociety.bind(zoneController));
router.post('/zones', requirePermission(PERMISSIONS.ACCESS_ZONE_MANAGE), zoneController.create.bind(zoneController));
router.patch('/zones/:id', requirePermission(PERMISSIONS.ACCESS_ZONE_MANAGE), zoneController.update.bind(zoneController));
router.get('/zones/:id/bindings', requirePermission(PERMISSIONS.ACCESS_ZONE_MANAGE), zoneController.listBindings.bind(zoneController));
router.post('/zones/:id/bind-device', requirePermission(PERMISSIONS.ACCESS_ZONE_MANAGE), zoneController.bindDevice.bind(zoneController));
router.post('/bindings/:id/unbind', requirePermission(PERMISSIONS.ACCESS_ZONE_MANAGE), zoneController.unbindDevice.bind(zoneController));

// Credentials
router.get('/society/:societyId/credentials', requirePermission(PERMISSIONS.ACCESS_CREDENTIAL_MANAGE), accessCredentialController.listBySociety.bind(accessCredentialController));
router.post('/credentials', requirePermission(PERMISSIONS.ACCESS_CREDENTIAL_MANAGE), accessCredentialController.create.bind(accessCredentialController));
router.post('/credentials/:id/revoke', requirePermission(PERMISSIONS.ACCESS_CREDENTIAL_MANAGE), accessCredentialController.revoke.bind(accessCredentialController));

// Policies
router.get('/society/:societyId/policies', requirePermission(PERMISSIONS.ACCESS_POLICY_MANAGE), accessPolicyController.listBySociety.bind(accessPolicyController));
router.post('/policies', requirePermission(PERMISSIONS.ACCESS_POLICY_MANAGE), accessPolicyController.create.bind(accessPolicyController));
router.patch('/policies/:id', requirePermission(PERMISSIONS.ACCESS_POLICY_MANAGE), accessPolicyController.update.bind(accessPolicyController));

// Events
router.get('/society/:societyId/events', requirePermission(PERMISSIONS.ACCESS_EVENT_VIEW), accessEventController.listBySociety.bind(accessEventController));
router.post('/society/:societyId/sync', requirePermission(PERMISSIONS.ACCESS_SYNC), accessEventController.sync.bind(accessEventController));
router.post('/events/:id/resolve', requirePermission(PERMISSIONS.ACCESS_EVENT_RESOLVE), accessEventController.resolve.bind(accessEventController));

export default router;
