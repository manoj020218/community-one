import mongoose, { Document, Model, Schema } from 'mongoose';

export interface ISamaShiftDocument extends Document {
  societyId: string;
  sourceProvider: 'EDGEFOLIO';
  externalShiftId: string;
  shiftName: string;
  startTime: string;
  endTime: string;
  breakDurationMinutes?: number;
  employeeCount?: number;
  externalUpdatedAt?: Date;
  lastSyncedAt: Date;
  rawData?: Record<string, unknown>;
}

const SamaShiftSchema = new Schema(
  {
    societyId: { type: Schema.Types.ObjectId, ref: 'Society', required: true },
    sourceProvider: { type: String, enum: ['EDGEFOLIO'], required: true },
    externalShiftId: { type: String, required: true, trim: true },
    shiftName: { type: String, required: true, trim: true },
    startTime: { type: String, required: true, trim: true },
    endTime: { type: String, required: true, trim: true },
    breakDurationMinutes: { type: Number },
    employeeCount: { type: Number },
    externalUpdatedAt: { type: Date },
    lastSyncedAt: { type: Date, required: true },
    rawData: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

SamaShiftSchema.index(
  { societyId: 1, sourceProvider: 1, externalShiftId: 1 },
  { unique: true }
);

export const SamaShift: Model<ISamaShiftDocument> = mongoose.model<ISamaShiftDocument>(
  'SamaShift',
  SamaShiftSchema
);
