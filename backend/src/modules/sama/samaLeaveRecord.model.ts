import mongoose, { Document, Model, Schema } from 'mongoose';

export interface ISamaLeaveRecordDocument extends Document {
  societyId: string;
  sourceProvider: 'EDGEFOLIO';
  externalLeaveId: string;
  externalStaffId: string;
  employeeName?: string;
  leaveType: string;
  fromDate: string;
  toDate: string;
  days?: number;
  reason?: string;
  status?: string;
  requestDate?: string;
  approvedBy?: string;
  externalUpdatedAt?: Date;
  lastSyncedAt: Date;
  rawData?: Record<string, unknown>;
}

const SamaLeaveRecordSchema = new Schema(
  {
    societyId: { type: Schema.Types.ObjectId, ref: 'Society', required: true },
    sourceProvider: { type: String, enum: ['EDGEFOLIO'], required: true },
    externalLeaveId: { type: String, required: true, trim: true },
    externalStaffId: { type: String, required: true, trim: true },
    employeeName: { type: String, trim: true },
    leaveType: { type: String, required: true, trim: true },
    fromDate: { type: String, required: true, trim: true },
    toDate: { type: String, required: true, trim: true },
    days: { type: Number },
    reason: { type: String, trim: true },
    status: { type: String, trim: true },
    requestDate: { type: String, trim: true },
    approvedBy: { type: String, trim: true },
    externalUpdatedAt: { type: Date },
    lastSyncedAt: { type: Date, required: true },
    rawData: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

SamaLeaveRecordSchema.index(
  { societyId: 1, sourceProvider: 1, externalLeaveId: 1 },
  { unique: true }
);

export const SamaLeaveRecord: Model<ISamaLeaveRecordDocument> = mongoose.model<ISamaLeaveRecordDocument>(
  'SamaLeaveRecord',
  SamaLeaveRecordSchema
);
