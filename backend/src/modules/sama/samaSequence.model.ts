import mongoose, { Document, Model, Schema } from 'mongoose';

export interface ISamaSequenceDocument extends Document {
  societyId: string;
  sequenceType: 'STAFF' | 'SERVICE_PROVIDER' | 'WORK_ORDER';
  periodKey: string;
  value: number;
}

const SamaSequenceSchema = new Schema(
  {
    societyId: { type: Schema.Types.ObjectId, ref: 'Society', required: true },
    sequenceType: { type: String, enum: ['STAFF', 'SERVICE_PROVIDER', 'WORK_ORDER'], required: true },
    periodKey: { type: String, required: true },
    value: { type: Number, default: 0 },
  },
  { timestamps: true }
);

SamaSequenceSchema.index({ societyId: 1, sequenceType: 1, periodKey: 1 }, { unique: true });

export const SamaSequence: Model<ISamaSequenceDocument> = mongoose.model<ISamaSequenceDocument>(
  'SamaSequence',
  SamaSequenceSchema
);
