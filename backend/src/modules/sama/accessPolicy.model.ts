import mongoose, { Document, Model, Schema } from 'mongoose';

export interface IAccessPolicyDocument extends Document {
  societyId: string;
  name: string;
  subjectType: 'STAFF_PROFILE' | 'SERVICE_PROVIDER' | 'WORK_ORDER';
  subjectId: string;
  accessMode: 'ALWAYS' | 'SCHEDULED' | 'ONE_TIME_WINDOW';
  allowedGateIds: string[];
  allowedDeviceIds: string[];
  allowedDaysOfWeek: string[];
  dailyStartTime?: string;
  dailyEndTime?: string;
  validFrom?: Date;
  validUntil?: Date;
  status: 'ACTIVE' | 'SUSPENDED' | 'EXPIRED';
  createdBy: string;
  updatedBy: string;
}

const AccessPolicySchema = new Schema(
  {
    societyId: { type: Schema.Types.ObjectId, ref: 'Society', required: true },
    name: { type: String, required: true, trim: true },
    subjectType: { type: String, enum: ['STAFF_PROFILE', 'SERVICE_PROVIDER', 'WORK_ORDER'], required: true },
    subjectId: { type: Schema.Types.ObjectId, required: true },
    accessMode: { type: String, enum: ['ALWAYS', 'SCHEDULED', 'ONE_TIME_WINDOW'], default: 'ALWAYS' },
    allowedGateIds: { type: [Schema.Types.ObjectId], ref: 'Gate', default: [] },
    allowedDeviceIds: { type: [Schema.Types.ObjectId], ref: 'Device', default: [] },
    allowedDaysOfWeek: { type: [String], default: [] },
    dailyStartTime: { type: String, trim: true },
    dailyEndTime: { type: String, trim: true },
    validFrom: { type: Date },
    validUntil: { type: Date },
    status: { type: String, enum: ['ACTIVE', 'SUSPENDED', 'EXPIRED'], default: 'ACTIVE' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

AccessPolicySchema.index({ societyId: 1, subjectType: 1, subjectId: 1 });
AccessPolicySchema.index({ societyId: 1, status: 1 });

export const AccessPolicy: Model<IAccessPolicyDocument> =
  mongoose.model<IAccessPolicyDocument>('AccessPolicy', AccessPolicySchema);
