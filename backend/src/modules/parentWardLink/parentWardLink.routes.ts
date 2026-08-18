import { Router } from 'express';
import { authenticate, requirePermission } from '../../common/middleware/auth';
import { PERMISSIONS } from '../../config/constants';
import { parentWardLinkController } from './parentWardLink.controller';

const router: Router = Router();

router.use(authenticate);
router.get('/me/wards', requirePermission(PERMISSIONS.PARENT_WARD_LINK_VIEW_OWN), parentWardLinkController.myWards.bind(parentWardLinkController));
router.get('/society/:societyId', requirePermission(PERMISSIONS.PARENT_WARD_LINK_MANAGE), parentWardLinkController.findBySociety.bind(parentWardLinkController));
router.post('/', requirePermission(PERMISSIONS.PARENT_WARD_LINK_MANAGE), parentWardLinkController.create.bind(parentWardLinkController));
router.patch('/:id', requirePermission(PERMISSIONS.PARENT_WARD_LINK_MANAGE), parentWardLinkController.update.bind(parentWardLinkController));
router.patch('/:id/disable', requirePermission(PERMISSIONS.PARENT_WARD_LINK_MANAGE), parentWardLinkController.disable.bind(parentWardLinkController));

export default router;
