import mongoose, { Document, Model, Schema } from 'mongoose';

export interface ISamaStaffProfileDocument extends Document {
  societyId: string;
  sourceProvider: 'EDGEFOLIO';
  externalStaffId: string;
  employeeCode?: string;
  fullName: string;
  email?: string;
  phone?: string;
  department?: string;
  designation?: string;
  joiningDate?: Date;
  status?: string;
  workType?: string;
  appRole?: string;
  allowRemoteAttendance: boolean;
  paymentMode?: string;
  salaryPaise?: number;
  externalUpdatedAt?: Date;
  lastSyncedAt: Date;
  rawData?: Record<string, unknown>;
}

const SamaStaffProfileSchema = new Schema(
  {
    societyId: { type: Schema.Types.ObjectId, ref: 'Society', required: true },
    sourceProvider: { type: String, enum: ['EDGEFOLIO'], required: true },
    externalStaffId: { type: String, required: true, trim: true },
    employeeCode: { type: String, trim: true },
    fullName: { type: String, required: true, trim: true },
    email: { type: String, trim: true, lowercase: true },
    phone: { type: String, trim: true },
    department: { type: String, trim: true },
    designation: { type: String, trim: true },
    joiningDate: { type: Date },
    status: { type: String, trim: true },
    workType: { type: String, trim: true },
    appRole: { type: String, trim: true },
    allowRemoteAttendance: { type: Boolean, default: false },
    paymentMode: { type: String, trim: true },
    salaryPaise: { type: Number },
    externalUpdatedAt: { type: Date },
    lastSyncedAt: { type: Date, required: true },
    rawData: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

SamaStaffProfileSchema.index(
  { societyId: 1, sourceProvider: 1, externalStaffId: 1 },
  { unique: true }
);

export const SamaStaffProfile: Model<ISamaStaffProfileDocument> = mongoose.model<ISamaStaffProfileDocument>(
  'SamaStaffProfile',
  SamaStaffProfileSchema
);
