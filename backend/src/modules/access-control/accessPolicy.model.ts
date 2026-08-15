import mongoose, { Document, Model, Schema } from 'mongoose';
import { AccessMode, PolicyStatus } from './access-control.types';

// Named AccessZonePolicy (not AccessPolicy) to avoid colliding with SAMA's own
// unrelated 'AccessPolicy' Mongoose model (staff/vendor gate access) — both would
// otherwise register the same model name and throw OverwriteModelError at boot.
export interface IAccessZonePolicyDocument extends Document {
  societyId: string;
  name: string;
  residentId: string;
  zoneIds: string[];
  accessMode: AccessMode;
  allowedDaysOfWeek?: string[];
  dailyStartTime?: string;
  dailyEndTime?: string;
  validFrom?: Date;
  validUntil?: Date;
  status: PolicyStatus;
  createdBy: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const AccessZonePolicySchema = new Schema(
  {
    societyId: { type: Schema.Types.ObjectId, ref: 'Society', required: true },
    name: { type: String, required: true, trim: true },
    residentId: { type: Schema.Types.ObjectId, ref: 'Resident', required: true },
    zoneIds: [{ type: Schema.Types.ObjectId, ref: 'Zone' }],
    accessMode: { type: String, enum: ['ALWAYS', 'SCHEDULED'], default: 'ALWAYS' },
    allowedDaysOfWeek: [{ type: String }],
    dailyStartTime: { type: String },
    dailyEndTime: { type: String },
    validFrom: { type: Date },
    validUntil: { type: Date },
    status: { type: String, enum: ['ACTIVE', 'SUSPENDED', 'EXPIRED'], default: 'ACTIVE' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

AccessZonePolicySchema.index({ societyId: 1, status: 1 });
AccessZonePolicySchema.index({ residentId: 1 });

export const AccessZonePolicy: Model<IAccessZonePolicyDocument> = mongoose.model<IAccessZonePolicyDocument>('AccessZonePolicy', AccessZonePolicySchema);
