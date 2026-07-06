import { Router } from 'express';
import { authenticate, requirePermission } from '../../common/middleware/auth';
import { fileAssetController, upload } from './fileAsset.controller';
import { PERMISSIONS } from '../../config/constants';

const router: Router = Router();
router.use(authenticate);

router.post('/upload', requirePermission(PERMISSIONS.FILE_UPLOAD), upload.single('file'), fileAssetController.uploadFile.bind(fileAssetController));
router.get('/society/:societyId', requirePermission(PERMISSIONS.SOCIETY_READ), fileAssetController.findBySociety.bind(fileAssetController));
router.delete('/:id', requirePermission(PERMISSIONS.FILE_UPLOAD), fileAssetController.delete.bind(fileAssetController));

export default router;
