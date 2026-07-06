import mongoose, { Schema, Document, Model } from 'mongoose';
import { ITower } from './tower.types';

export interface ITowerDocument extends ITower, Document {}

const TowerSchema = new Schema(
  {
    societyId: { type: Schema.Types.ObjectId, ref: 'Society', required: true },
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, trim: true },
    type: {
      type: String,
      enum: ['TOWER', 'BLOCK', 'VILLA_ROW', 'SHOP_BLOCK', 'OTHER'],
      default: 'TOWER',
    },
    numberOfFloors: { type: Number, required: true, min: 1 },
    totalFlats: { type: Number, default: 0 },
    hasLift: { type: Boolean, default: false },
    status: { type: String, enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

TowerSchema.index({ societyId: 1, code: 1 }, { unique: true });

export const Tower: Model<ITowerDocument> = mongoose.model<ITowerDocument>('Tower', TowerSchema);
