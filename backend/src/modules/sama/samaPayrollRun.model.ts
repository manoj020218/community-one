import mongoose, { Document, Model, Schema } from 'mongoose';

export interface ISamaPayrollRunDocument extends Document {
  societyId: string;
  sourceProvider: 'EDGEFOLIO';
  externalRunId: string;
  monthKey: string;
  monthLabel?: string;
  year?: number;
  status?: string;
  totalEmployees?: number;
  processedCount?: number;
  totalAmountPaise?: number;
  processedDate?: string;
  processedBy?: string;
  externalUpdatedAt?: Date;
  lastSyncedAt: Date;
  rawData?: Record<string, unknown>;
}

const SamaPayrollRunSchema = new Schema(
  {
    societyId: { type: Schema.Types.ObjectId, ref: 'Society', required: true },
    sourceProvider: { type: String, enum: ['EDGEFOLIO'], required: true },
    externalRunId: { type: String, required: true, trim: true },
    monthKey: { type: String, required: true, trim: true },
    monthLabel: { type: String, trim: true },
    year: { type: Number },
    status: { type: String, trim: true },
    totalEmployees: { type: Number },
    processedCount: { type: Number },
    totalAmountPaise: { type: Number },
    processedDate: { type: String, trim: true },
    processedBy: { type: String, trim: true },
    externalUpdatedAt: { type: Date },
    lastSyncedAt: { type: Date, required: true },
    rawData: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

SamaPayrollRunSchema.index(
  { societyId: 1, sourceProvider: 1, externalRunId: 1 },
  { unique: true }
);

export const SamaPayrollRun: Model<ISamaPayrollRunDocument> = mongoose.model<ISamaPayrollRunDocument>(
  'SamaPayrollRun',
  SamaPayrollRunSchema
);
