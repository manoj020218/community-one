import { Router } from 'express';
import { authenticate, requirePermission, requireSocietyAccess, requireResourceSocietyAccess } from '../../common/middleware/auth';
import { petController } from './pet.controller';
import { Pet } from './pet.model';
import { Flat } from '../flat/flat.model';
import { PERMISSIONS } from '../../config/constants';

const router: Router = Router();
router.use(authenticate);

router.get('/society/:societyId', requirePermission(PERMISSIONS.PET_READ), requireSocietyAccess, petController.findBySociety.bind(petController));
router.get('/flat/:flatId', requirePermission(PERMISSIONS.PET_READ), requireResourceSocietyAccess(Flat, 'flatId'), petController.findByFlat.bind(petController));
router.post('/', requirePermission(PERMISSIONS.PET_CREATE), requireSocietyAccess, petController.create.bind(petController));
router.get('/:id', requirePermission(PERMISSIONS.PET_READ), requireResourceSocietyAccess(Pet), petController.findById.bind(petController));
router.patch('/:id', requirePermission(PERMISSIONS.PET_UPDATE), requireResourceSocietyAccess(Pet), petController.update.bind(petController));
router.patch('/:id/disable', requirePermission(PERMISSIONS.PET_DISABLE), requireResourceSocietyAccess(Pet), petController.disable.bind(petController));

export default router;
