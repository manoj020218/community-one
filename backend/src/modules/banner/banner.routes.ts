import { Router } from 'express';
import { authenticate, requirePermission } from '../../common/middleware/auth';
import { PERMISSIONS } from '../../config/constants';
import { bannerController } from './banner.controller';

const router: Router = Router();

router.use(authenticate);
router.get('/active', bannerController.listActive.bind(bannerController));
router.get('/', requirePermission(PERMISSIONS.BANNER_MANAGE), bannerController.list.bind(bannerController));
router.post('/', requirePermission(PERMISSIONS.BANNER_MANAGE), bannerController.create.bind(bannerController));
router.patch('/:id', requirePermission(PERMISSIONS.BANNER_MANAGE), bannerController.update.bind(bannerController));
router.patch('/:id/disable', requirePermission(PERMISSIONS.BANNER_MANAGE), bannerController.disable.bind(bannerController));

export default router;
