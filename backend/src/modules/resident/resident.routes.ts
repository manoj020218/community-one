import { Router } from 'express';
import { authenticate, requirePermission, requireSocietyAccess, requireResourceSocietyAccess } from '../../common/middleware/auth';
import { residentController } from './resident.controller';
import { Resident } from './resident.model';
import { Flat } from '../flat/flat.model';
import { PERMISSIONS } from '../../config/constants';

const router: Router = Router();
router.use(authenticate);

router.get('/society/:societyId', requirePermission(PERMISSIONS.RESIDENT_READ), requireSocietyAccess, residentController.findBySociety.bind(residentController));
router.get('/flat/:flatId', requirePermission(PERMISSIONS.RESIDENT_READ), requireResourceSocietyAccess(Flat, 'flatId'), residentController.findByFlat.bind(residentController));
router.post('/', requirePermission(PERMISSIONS.RESIDENT_CREATE), requireSocietyAccess, residentController.create.bind(residentController));
router.get('/:id', requirePermission(PERMISSIONS.RESIDENT_READ), requireResourceSocietyAccess(Resident), residentController.findById.bind(residentController));
router.patch('/:id/kyc', requirePermission(PERMISSIONS.RESIDENT_UPDATE), requireResourceSocietyAccess(Resident), residentController.markKyc.bind(residentController));
router.patch('/:id', requirePermission(PERMISSIONS.RESIDENT_UPDATE), requireResourceSocietyAccess(Resident), residentController.update.bind(residentController));
router.patch('/:id/disable', requirePermission(PERMISSIONS.RESIDENT_DISABLE), requireResourceSocietyAccess(Resident), residentController.disable.bind(residentController));

export default router;
