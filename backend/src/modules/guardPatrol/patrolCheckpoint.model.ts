import mongoose, { Schema, Document, Model } from 'mongoose';

export type PatrolCheckpointMethod = 'QR' | 'NFC';

export interface IPatrolCheckpointDocument extends Document {
  societyId: string;
  name: string;
  method: PatrolCheckpointMethod;
  token: string;
  towerId?: string;
  isActive: boolean;
  createdBy: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const PatrolCheckpointSchema = new Schema(
  {
    societyId: { type: Schema.Types.ObjectId, ref: 'Society', required: true },
    name: { type: String, required: true, trim: true },
    method: { type: String, enum: ['QR', 'NFC'], required: true },
    // Random, unguessable — embedded in the printed QR's URL, or (for NFC) the tag's own UID
    // captured once during setup. Not derived from anything guessable like a sequence number.
    token: { type: String, required: true, unique: true },
    towerId: { type: Schema.Types.ObjectId, ref: 'Tower' },
    isActive: { type: Boolean, default: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

PatrolCheckpointSchema.index({ societyId: 1, isActive: 1 });

export const PatrolCheckpoint: Model<IPatrolCheckpointDocument> = mongoose.model<IPatrolCheckpointDocument>('PatrolCheckpoint', PatrolCheckpointSchema);
