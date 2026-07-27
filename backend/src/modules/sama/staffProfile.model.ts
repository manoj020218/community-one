import mongoose, { Document, Model, Schema } from 'mongoose';

export interface IStaffProfileDocument extends Document {
  societyId: string;
  staffCode: string;
  firstName: string;
  lastName?: string;
  displayName: string;
  mobile: string;
  email?: string;
  staffType: string;
  primaryCategory?: string;
  photoFileId?: string;
  lifecycleStatus: 'ACTIVE' | 'SUSPENDED' | 'TERMINATED';
  accessStatus: 'ACTIVE' | 'SUSPENDED' | 'BLOCKED';
  verificationStatus: 'PENDING' | 'APPROVED' | 'REJECTED';
  approvedAt?: Date;
  approvedByUserId?: string;
  suspendedAt?: Date;
  suspendedByUserId?: string;
  suspensionReason?: string;
  terminatedAt?: Date;
  terminatedByUserId?: string;
  terminationReason?: string;
  createdBy: string;
  updatedBy: string;
}

const StaffProfileSchema = new Schema(
  {
    societyId: { type: Schema.Types.ObjectId, ref: 'Society', required: true },
    staffCode: { type: String, required: true, trim: true },
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, trim: true },
    displayName: { type: String, required: true, trim: true },
    mobile: { type: String, required: true, trim: true },
    email: { type: String, trim: true, lowercase: true },
    staffType: { type: String, enum: ['SOCIETY_EMPLOYEE', 'HOUSEHOLD_STAFF', 'SERVICE_POOL_WORKER', 'CONTRACTOR_EMPLOYEE', 'TEMPORARY_WORKER'], required: true },
    primaryCategory: { type: String, trim: true },
    photoFileId: { type: Schema.Types.ObjectId, ref: 'FileAsset' },
    lifecycleStatus: { type: String, enum: ['ACTIVE', 'SUSPENDED', 'TERMINATED'], default: 'ACTIVE' },
    accessStatus: { type: String, enum: ['ACTIVE', 'SUSPENDED', 'BLOCKED'], default: 'ACTIVE' },
    verificationStatus: { type: String, enum: ['PENDING', 'APPROVED', 'REJECTED'], default: 'PENDING' },
    approvedAt: { type: Date },
    approvedByUserId: { type: Schema.Types.ObjectId, ref: 'User' },
    suspendedAt: { type: Date },
    suspendedByUserId: { type: Schema.Types.ObjectId, ref: 'User' },
    suspensionReason: { type: String, trim: true },
    terminatedAt: { type: Date },
    terminatedByUserId: { type: Schema.Types.ObjectId, ref: 'User' },
    terminationReason: { type: String, trim: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

StaffProfileSchema.index({ societyId: 1, staffCode: 1 }, { unique: true });
StaffProfileSchema.index({ societyId: 1, mobile: 1 });

export const StaffProfile: Model<IStaffProfileDocument> = mongoose.model<IStaffProfileDocument>(
  'StaffProfile',
  StaffProfileSchema
);
