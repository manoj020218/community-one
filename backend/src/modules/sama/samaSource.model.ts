import mongoose, { Document, Model, Schema } from 'mongoose';

export interface ISamaSourceDocument extends Document {
  societyId: string;
  provider: 'EDGEFOLIO';
  baseUrl: string;
  apiPrefix: string;
  encryptedAccessToken?: string;
  isActive: boolean;
  syncScheduleEnabled: boolean;
  syncIntervalMinutes: number;
  scheduledSyncTypes: string[];
  lastEmployeeSyncAt?: Date;
  lastAttendanceSyncAt?: Date;
  lastShiftSyncAt?: Date;
  lastLeaveSyncAt?: Date;
  lastPayrollSyncAt?: Date;
  lastAccessEventSyncAt?: Date;
  lastScheduledSyncAt?: Date;
  lastSuccessfulSyncAt?: Date;
  lastSyncFailureAt?: Date;
  lastSyncAlertAt?: Date;
  lastSyncError?: string;
  consecutiveSyncFailures: number;
  syncRetryLimit: number;
  staleAfterMinutes: number;
  createdBy?: string;
  updatedBy?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const SamaSourceSchema = new Schema(
  {
    societyId: { type: Schema.Types.ObjectId, ref: 'Society', required: true, unique: true },
    provider: { type: String, enum: ['EDGEFOLIO'], default: 'EDGEFOLIO' },
    baseUrl: { type: String, required: true, trim: true },
    apiPrefix: { type: String, default: '/api/v1', trim: true },
    encryptedAccessToken: { type: String },
    isActive: { type: Boolean, default: true },
    syncScheduleEnabled: { type: Boolean, default: false },
    syncIntervalMinutes: { type: Number, default: 60 },
    scheduledSyncTypes: {
      type: [String],
      default: ['EMPLOYEES', 'ATTENDANCE', 'LEAVES', 'SHIFTS', 'PAYROLL', 'ACCESS_EVENTS'],
    },
    lastEmployeeSyncAt: { type: Date },
    lastAttendanceSyncAt: { type: Date },
    lastShiftSyncAt: { type: Date },
    lastLeaveSyncAt: { type: Date },
    lastPayrollSyncAt: { type: Date },
    lastAccessEventSyncAt: { type: Date },
    lastScheduledSyncAt: { type: Date },
    lastSuccessfulSyncAt: { type: Date },
    lastSyncFailureAt: { type: Date },
    lastSyncAlertAt: { type: Date },
    lastSyncError: { type: String },
    consecutiveSyncFailures: { type: Number, default: 0 },
    syncRetryLimit: { type: Number, default: 2 },
    staleAfterMinutes: { type: Number, default: 180 },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

export const SamaSource: Model<ISamaSourceDocument> = mongoose.model<ISamaSourceDocument>(
  'SamaSource',
  SamaSourceSchema
);
