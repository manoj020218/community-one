import mongoose, { Document, Model, Schema } from 'mongoose';
import { CredentialStatus } from './access-control.types';

// Named AccessZoneCredential (not AccessCredential) to avoid colliding with SAMA's
// own unrelated 'AccessCredential' Mongoose model (staff/vendor PIN/RFID credentials).
export interface IAccessZoneCredentialDocument extends Document {
  societyId: string;
  residentId: string;
  deviceId: string;
  deviceExternalUserId: string;
  label?: string;
  status: CredentialStatus;
  createdBy: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const AccessZoneCredentialSchema = new Schema(
  {
    societyId: { type: Schema.Types.ObjectId, ref: 'Society', required: true },
    residentId: { type: Schema.Types.ObjectId, ref: 'Resident', required: true },
    deviceId: { type: Schema.Types.ObjectId, ref: 'Device', required: true },
    deviceExternalUserId: { type: String, required: true, trim: true },
    label: { type: String, trim: true },
    status: { type: String, enum: ['ACTIVE', 'REVOKED'], default: 'ACTIVE' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

AccessZoneCredentialSchema.index({ deviceId: 1, deviceExternalUserId: 1 }, { unique: true });
AccessZoneCredentialSchema.index({ societyId: 1, residentId: 1 });

export const AccessZoneCredential: Model<IAccessZoneCredentialDocument> = mongoose.model<IAccessZoneCredentialDocument>(
  'AccessZoneCredential',
  AccessZoneCredentialSchema
);
