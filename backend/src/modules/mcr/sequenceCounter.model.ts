import mongoose, { Document, Model, Schema } from 'mongoose';
import { MCR_SEQUENCE_TYPES } from './mcrDomain.types';

export interface ISequenceCounterDocument extends Document {
  societyId: string;
  sequenceType: string;
  periodKey: string;
  value: number;
  createdAt?: Date;
  updatedAt?: Date;
}

const SequenceCounterSchema = new Schema(
  {
    societyId: { type: Schema.Types.ObjectId, ref: 'Society', required: true },
    sequenceType: { type: String, enum: MCR_SEQUENCE_TYPES, required: true },
    periodKey: { type: String, required: true },
    value: { type: Number, default: 0 },
  },
  { timestamps: true }
);

SequenceCounterSchema.index({ societyId: 1, sequenceType: 1, periodKey: 1 }, { unique: true });

export const SequenceCounter: Model<ISequenceCounterDocument> = mongoose.model<ISequenceCounterDocument>(
  'SequenceCounter',
  SequenceCounterSchema
);
