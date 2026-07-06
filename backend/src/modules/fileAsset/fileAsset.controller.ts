import { Response, NextFunction } from 'express';
import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { AuthenticatedRequest } from '../../common/types';
import { fileAssetService } from './fileAsset.service';
import { sendSuccess, sendCreated } from '../../common/utils/response';
import { env } from '../../config/env';
import fs from 'fs';

const uploadDir = path.join(process.cwd(), env.UPLOAD_DIR);
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  },
});

const fileFilter = (_req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowed = ['image/jpeg','image/png','image/gif','image/webp','application/pdf'];
  if (allowed.includes(file.mimetype)) cb(null, true);
  else cb(new Error('File type not allowed'));
};

export const upload = multer({ storage, fileFilter, limits: { fileSize: env.MAX_FILE_SIZE } });

export class FileAssetController {
  async uploadFile(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.file) {
        res.status(400).json({ success: false, error: { code: 'NO_FILE', message: 'No file uploaded' } });
        return;
      }
      const file = await fileAssetService.saveFile(req.file, req.user!.userId, {
        societyId: req.body.societyId,
        moduleCode: req.body.moduleCode || 'CORE',
        entityType: req.body.entityType,
        entityId: req.body.entityId,
        accessLevel: req.body.accessLevel,
      });
      sendCreated(res, file, 'File uploaded successfully');
    } catch (error) { next(error); }
  }

  async findBySociety(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const files = await fileAssetService.findBySociety(req.params.societyId);
      sendSuccess(res, files, 'Files retrieved');
    } catch (error) { next(error); }
  }

  async delete(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      await fileAssetService.delete(req.params.id);
      sendSuccess(res, null, 'File deleted');
    } catch (error) { next(error); }
  }
}

export const fileAssetController = new FileAssetController();
