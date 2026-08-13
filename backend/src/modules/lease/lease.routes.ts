import { Router } from 'express';
import { authenticate, requirePermission } from '../../common/middleware/auth';
import { PERMISSIONS } from '../../config/constants';
import { leaseController } from './lease.controller';

const router: Router = Router();
router.use(authenticate);

router.get('/society/:societyId', requirePermission(PERMISSIONS.LEASE_READ), leaseController.listBySociety.bind(leaseController));
router.post('/', requirePermission(PERMISSIONS.LEASE_CREATE), leaseController.create.bind(leaseController));
router.get('/:id', requirePermission(PERMISSIONS.LEASE_READ), leaseController.findById.bind(leaseController));
router.patch('/:id', requirePermission(PERMISSIONS.LEASE_UPDATE), leaseController.update.bind(leaseController));
router.post('/:id/renew', requirePermission(PERMISSIONS.LEASE_RENEW), leaseController.renew.bind(leaseController));
router.post('/:id/terminate', requirePermission(PERMISSIONS.LEASE_TERMINATE), leaseController.terminate.bind(leaseController));

export default router;
