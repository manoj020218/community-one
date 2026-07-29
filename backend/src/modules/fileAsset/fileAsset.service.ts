import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { FileAsset, IFileAssetDocument } from './fileAsset.model';
import { env } from '../../config/env';

const EXT_BY_MIME: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
};

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

  /** Persists a file that didn't arrive via an HTTP multipart request (e.g. WhatsApp media). */
  async saveBuffer(
    buffer: Buffer,
    uploadedBy: string,
    meta: { societyId?: string; moduleCode?: string; entityType?: string; entityId?: string; accessLevel?: string; mimeType: string; originalName?: string }
  ): Promise<IFileAssetDocument> {
    const ext = EXT_BY_MIME[meta.mimeType] || '';
    const fileName = `${uuidv4()}${ext}`;
    fs.writeFileSync(path.join(this.getUploadPath(), fileName), buffer);
    return FileAsset.create({
      uploadedBy,
      fileName,
      originalName: meta.originalName || fileName,
      mimeType: meta.mimeType,
      size: buffer.length,
      url: `/uploads/${fileName}`,
      storageProvider: 'LOCAL',
      societyId: meta.societyId,
      moduleCode: meta.moduleCode,
      entityType: meta.entityType,
      entityId: meta.entityId,
      accessLevel: meta.accessLevel,
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
