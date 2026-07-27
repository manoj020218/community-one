import mongoose, { Document, Model, Schema } from 'mongoose';

export interface IAccessCredentialDocument extends Document {
  societyId: string;
  subjectType: 'STAFF_PROFILE' | 'SERVICE_PROVIDER' | 'WORK_ORDER';
  subjectId: string;
  accessPolicyId?: string;
  credentialType: 'PIN' | 'QR' | 'RFID' | 'BIOMETRIC_REFERENCE' | 'MOBILE_TOKEN';
  credentialLabel?: string;
  identifierHash: string;
  identifierLast4: string;
  validUntil?: Date;
  issuedAt: Date;
  status: 'ACTIVE' | 'REVOKED' | 'EXPIRED';
  revokedAt?: Date;
  revokedByUserId?: string;
  createdBy: string;
  updatedBy: string;
}

const transform = (_doc: unknown, ret: Record<string, unknown>) => {
  delete ret.identifierHash;
  return ret;
};

const AccessCredentialSchema = new Schema(
  {
    societyId: { type: Schema.Types.ObjectId, ref: 'Society', required: true },
    subjectType: { type: String, enum: ['STAFF_PROFILE', 'SERVICE_PROVIDER', 'WORK_ORDER'], required: true },
    subjectId: { type: Schema.Types.ObjectId, required: true },
    accessPolicyId: { type: Schema.Types.ObjectId, ref: 'AccessPolicy' },
    credentialType: { type: String, enum: ['PIN', 'QR', 'RFID', 'BIOMETRIC_REFERENCE', 'MOBILE_TOKEN'], required: true },
    credentialLabel: { type: String, trim: true },
    identifierHash: { type: String, required: true },
    identifierLast4: { type: String, required: true },
    validUntil: { type: Date },
    issuedAt: { type: Date, default: Date.now },
    status: { type: String, enum: ['ACTIVE', 'REVOKED', 'EXPIRED'], default: 'ACTIVE' },
    revokedAt: { type: Date },
    revokedByUserId: { type: Schema.Types.ObjectId, ref: 'User' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true, toJSON: { transform }, toObject: { transform } }
);

AccessCredentialSchema.index({ societyId: 1, credentialType: 1, identifierHash: 1 }, { unique: true });
AccessCredentialSchema.index({ societyId: 1, subjectType: 1, subjectId: 1, status: 1 });

export const AccessCredential: Model<IAccessCredentialDocument> =
  mongoose.model<IAccessCredentialDocument>('AccessCredential', AccessCredentialSchema);
