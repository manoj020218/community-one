import { Router } from 'express';
import { authenticate, requirePermission, requireSocietyAccess, requireResourceSocietyAccess } from '../../common/middleware/auth';
import { fileAssetController, upload } from './fileAsset.controller';
import { FileAsset } from './fileAsset.model';
import { PERMISSIONS } from '../../config/constants';

const router: Router = Router();
router.use(authenticate);

// requireSocietyAccess must run AFTER multer (upload.single) — societyId is a multipart form
// field, so req.body isn't populated until multer parses it.
router.post('/upload', requirePermission(PERMISSIONS.FILE_UPLOAD), upload.single('file'), requireSocietyAccess, fileAssetController.uploadFile.bind(fileAssetController));
router.get('/society/:societyId', requirePermission(PERMISSIONS.SOCIETY_READ), requireSocietyAccess, fileAssetController.findBySociety.bind(fileAssetController));
router.delete('/:id', requirePermission(PERMISSIONS.FILE_UPLOAD), requireResourceSocietyAccess(FileAsset), fileAssetController.delete.bind(fileAssetController));

export default router;
