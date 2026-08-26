import { Router } from 'express';
import { authenticate, requirePermission, requireSocietyAccess, requireResourceSocietyAccess } from '../../common/middleware/auth';
import { flatController } from './flat.controller';
import { Flat } from './flat.model';
import { Floor } from '../floor/floor.model';
import { PERMISSIONS } from '../../config/constants';

const router: Router = Router();
router.use(authenticate);

router.get('/society/:societyId', requirePermission(PERMISSIONS.FLAT_READ), requireSocietyAccess, flatController.findBySociety.bind(flatController));
router.get('/society/:societyId/stats', requirePermission(PERMISSIONS.FLAT_READ), requireSocietyAccess, flatController.getStats.bind(flatController));
router.get('/society/:societyId/stats-by-tower', requirePermission(PERMISSIONS.FLAT_READ), requireSocietyAccess, flatController.getStatsByTower.bind(flatController));
router.get('/floor/:floorId', requirePermission(PERMISSIONS.FLAT_READ), requireResourceSocietyAccess(Floor, 'floorId'), flatController.findByFloor.bind(flatController));
router.post('/generate', requirePermission(PERMISSIONS.FLAT_CREATE), requireSocietyAccess, flatController.generate.bind(flatController));
router.post('/', requirePermission(PERMISSIONS.FLAT_CREATE), requireSocietyAccess, flatController.create.bind(flatController));
// Self-service — a resident role (OWNER/TENANT/FAMILY_MEMBER) doesn't hold FLAT_READ (that's
// admin-scoped, for browsing any flat), but every resident should be able to see their own.
// Scoped strictly to the caller's own flatId from the JWT, so no permission check needed.
router.get('/me', flatController.findMine.bind(flatController));
router.get('/:id', requirePermission(PERMISSIONS.FLAT_READ), requireResourceSocietyAccess(Flat), flatController.findById.bind(flatController));
router.patch('/:id', requirePermission(PERMISSIONS.FLAT_UPDATE), requireResourceSocietyAccess(Flat), flatController.update.bind(flatController));
router.delete('/:id', requirePermission(PERMISSIONS.FLAT_DELETE), requireResourceSocietyAccess(Flat), flatController.delete.bind(flatController));

export default router;
