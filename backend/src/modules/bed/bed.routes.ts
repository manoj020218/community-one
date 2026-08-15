import { Router } from 'express';
import { authenticate, requirePermission } from '../../common/middleware/auth';
import { PERMISSIONS } from '../../config/constants';
import { bedController } from './bed.controller';

const router: Router = Router();
router.use(authenticate);

router.get('/flat/:flatId', requirePermission(PERMISSIONS.BED_READ), bedController.listByFlat.bind(bedController));
router.post('/', requirePermission(PERMISSIONS.BED_CREATE), bedController.create.bind(bedController));
router.post('/generate', requirePermission(PERMISSIONS.BED_CREATE), bedController.generate.bind(bedController));
router.patch('/:id', requirePermission(PERMISSIONS.BED_UPDATE), bedController.update.bind(bedController));
router.post('/:id/assign', requirePermission(PERMISSIONS.BED_ASSIGN), bedController.assign.bind(bedController));
router.post('/:id/release', requirePermission(PERMISSIONS.BED_RELEASE), bedController.release.bind(bedController));
router.post('/:id/disable', requirePermission(PERMISSIONS.BED_UPDATE), bedController.disable.bind(bedController));

export default router;
