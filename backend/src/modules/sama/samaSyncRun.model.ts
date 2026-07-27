import mongoose, { Document, Model, Schema } from 'mongoose';

export interface ISamaSyncRunDocument extends Document {
  societyId: string;
  provider: 'EDGEFOLIO';
  syncType: string;
  status: 'RUNNING' | 'SUCCESS' | 'FAILED';
  triggerMode: 'MANUAL' | 'SCHEDULED';
  filters?: Record<string, unknown>;
  importedCount?: number;
  createdCount?: number;
  updatedCount?: number;
  errorMessage?: string;
  triggeredBy?: string;
  retryOfSyncRunId?: string;
  attemptCount: number;
  startedAt: Date;
  completedAt?: Date;
}

const SamaSyncRunSchema = new Schema(
  {
    societyId: { type: Schema.Types.ObjectId, ref: 'Society', required: true },
    provider: { type: String, enum: ['EDGEFOLIO'], default: 'EDGEFOLIO' },
    syncType: { type: String, required: true, trim: true },
    status: { type: String, enum: ['RUNNING', 'SUCCESS', 'FAILED'], default: 'RUNNING' },
    triggerMode: { type: String, enum: ['MANUAL', 'SCHEDULED'], default: 'MANUAL' },
    filters: { type: Schema.Types.Mixed },
    importedCount: { type: Number },
    createdCount: { type: Number },
    updatedCount: { type: Number },
    errorMessage: { type: String, trim: true },
    triggeredBy: { type: Schema.Types.ObjectId, ref: 'User' },
    retryOfSyncRunId: { type: Schema.Types.ObjectId, ref: 'SamaSyncRun' },
    attemptCount: { type: Number, default: 1 },
    startedAt: { type: Date, required: true },
    completedAt: { type: Date },
  },
  { timestamps: true }
);

SamaSyncRunSchema.index({ societyId: 1, syncType: 1, startedAt: -1 });

export const SamaSyncRun: Model<ISamaSyncRunDocument> = mongoose.model<ISamaSyncRunDocument>(
  'SamaSyncRun',
  SamaSyncRunSchema
);
