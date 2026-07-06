import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IHealthLogDocument extends Document {
  service: string;
  status: 'OK' | 'WARN' | 'ERROR';
  message: string;
  metadata?: Record<string, any>;
  createdAt?: Date;
}

const HealthLogSchema = new Schema(
  {
    service: { type: String, required: true },
    status: { type: String, enum: ['OK','WARN','ERROR'], required: true },
    message: { type: String, required: true },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: true, updatedAt: false }
);

HealthLogSchema.index({ service: 1, createdAt: -1 });

export const HealthLog: Model<IHealthLogDocument> = mongoose.model<IHealthLogDocument>('HealthLog', HealthLogSchema);
