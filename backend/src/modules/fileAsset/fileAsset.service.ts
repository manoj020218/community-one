import path from 'path';
import { FileAsset, IFileAssetDocument } from './fileAsset.model';
import { env } from '../../config/env';

export class FileAssetService {
  async saveFile(
    file: Express.Multer.File,
    uploadedBy: string,
    meta: { societyId?: string; moduleCode?: string; entityType?: string; entityId?: string; accessLevel?: string }
  ): Promise<IFileAssetDocument> {
    const url = `/uploads/${file.filename}`;
    return FileAsset.create({
      uploadedBy,
      fileName: file.filename,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      url,
      storageProvider: 'LOCAL',
      ...meta,
    });
  }

  async findBySociety(societyId: string): Promise<IFileAssetDocument[]> {
    return FileAsset.find({ societyId, isActive: true }).sort({ createdAt: -1 });
  }

  async findByEntity(entityType: string, entityId: string): Promise<IFileAssetDocument[]> {
    return FileAsset.find({ entityType, entityId, isActive: true });
  }

  async findById(id: string): Promise<IFileAssetDocument | null> {
    return FileAsset.findById(id);
  }

  async delete(id: string): Promise<void> {
    await FileAsset.findByIdAndUpdate(id, { isActive: false });
  }

  getUploadPath(): string {
    return path.join(process.cwd(), env.UPLOAD_DIR);
  }
}

export const fileAssetService = new FileAssetService();
