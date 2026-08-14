import mongoose, { Schema, Document, Model } from 'mongoose';

/**
 * Registers OTA firmware metadata only — the actual .bin file is uploaded to the VPS directly
 * (scp/pscp to /var/www/community/firmware/<deviceModel>/<version>.bin, served statically by the
 * existing frontend nginx block, no new nginx config needed). This just records where the
 * latest one lives so a gateway's version-check call has something to compare against.
 */
export interface IFirmwareReleaseDocument extends Document {
  deviceModel: string;
  version: string;
  url: string;
  sha256: string;
  releaseNotes?: string;
  createdBy: string;
  createdAt?: Date;
}

const FirmwareReleaseSchema = new Schema(
  {
    deviceModel: { type: String, required: true, trim: true, lowercase: true },
    version: { type: String, required: true, trim: true },
    url: { type: String, required: true },
    sha256: { type: String, required: true },
    releaseNotes: { type: String },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

FirmwareReleaseSchema.index({ deviceModel: 1, createdAt: -1 });

export const FirmwareRelease: Model<IFirmwareReleaseDocument> = mongoose.model<IFirmwareReleaseDocument>(
  'FirmwareRelease',
  FirmwareReleaseSchema
);
