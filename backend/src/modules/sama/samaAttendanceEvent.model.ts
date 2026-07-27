import mongoose, { Document, Model, Schema } from 'mongoose';

export interface ISamaAttendanceEventDocument extends Document {
  societyId: string;
  sourceProvider: 'EDGEFOLIO';
  externalEventId: string;
  externalStaffId?: string;
  attendanceDate?: string;
  checkInAt?: string;
  checkOutAt?: string;
  status?: string;
  workedMinutes?: number;
  faceMatch?: boolean;
  employeeName?: string;
  department?: string;
  externalUpdatedAt?: Date;
  lastSyncedAt: Date;
  rawData?: Record<string, unknown>;
}

const SamaAttendanceEventSchema = new Schema(
  {
    societyId: { type: Schema.Types.ObjectId, ref: 'Society', required: true },
    sourceProvider: { type: String, enum: ['EDGEFOLIO'], required: true },
    externalEventId: { type: String, required: true, trim: true },
    externalStaffId: { type: String, trim: true },
    attendanceDate: { type: String, trim: true },
    checkInAt: { type: String, trim: true },
    checkOutAt: { type: String, trim: true },
    status: { type: String, trim: true },
    workedMinutes: { type: Number },
    faceMatch: { type: Boolean },
    employeeName: { type: String, trim: true },
    department: { type: String, trim: true },
    externalUpdatedAt: { type: Date },
    lastSyncedAt: { type: Date, required: true },
    rawData: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

SamaAttendanceEventSchema.index(
  { societyId: 1, sourceProvider: 1, externalEventId: 1 },
  { unique: true }
);

export const SamaAttendanceEvent: Model<ISamaAttendanceEventDocument> = mongoose.model<ISamaAttendanceEventDocument>(
  'SamaAttendanceEvent',
  SamaAttendanceEventSchema
);
