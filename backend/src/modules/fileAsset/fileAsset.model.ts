import mongoose, { Schema, Document, Model } from 'mongoose';

export type AccessLevel = 'PRIVATE' | 'SOCIETY_ADMIN' | 'RESIDENT' | 'PUBLIC';

export interface IFileAssetDocument extends Document {
  societyId?: string;
  uploadedBy: string;
  moduleCode: string;
  entityType?: string;
  entityId?: string;
  fileName: string;
  originalName: string;
  mimeType: string;
  size: number;
  storageProvider: 'LOCAL' | 'S3' | 'GCS';
  url: string;
  accessLevel: AccessLevel;
  isActive: boolean;
  createdAt?: Date;
}

const FileAssetSchema = new Schema(
  {
    societyId: { type: Schema.Types.ObjectId, ref: 'Society' },
    uploadedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    moduleCode: { type: String, default: 'CORE' },
    entityType: { type: String },
    entityId: { type: String },
    fileName: { type: String, required: true },
    originalName: { type: String, required: true },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true },
    storageProvider: { type: String, enum: ['LOCAL','S3','GCS'], default: 'LOCAL' },
    url: { type: String, required: true },
    accessLevel: { type: String, enum: ['PRIVATE','SOCIETY_ADMIN','RESIDENT','PUBLIC'], default: 'SOCIETY_ADMIN' },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true, updatedAt: false }
);

FileAssetSchema.index({ societyId: 1 });
FileAssetSchema.index({ entityType: 1, entityId: 1 });

export const FileAsset: Model<IFileAssetDocument> = mongoose.model<IFileAssetDocument>('FileAsset', FileAssetSchema);
