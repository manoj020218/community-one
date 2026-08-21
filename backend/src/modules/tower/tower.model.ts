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
    // Typical/residential floors only (the "10" in a G+10 building) — Ground floor and
    // basements are tracked separately below so they never get silently folded into this count.
    numberOfFloors: { type: Number, required: true, min: 1 },
    hasGroundFloor: { type: Boolean, default: true },
    basementCount: { type: Number, default: 0 },
    totalFlats: { type: Number, default: 0 },
    hasLift: { type: Boolean, default: false },
    status: { type: String, enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// partialFilterExpression: a soft-deleted tower (isActive: false) no longer reserves its
// code, so an admin can delete a wrongly-created tower and immediately reuse the same name.
TowerSchema.index({ societyId: 1, code: 1 }, { unique: true, partialFilterExpression: { isActive: true } });

export const Tower: Model<ITowerDocument> = mongoose.model<ITowerDocument>('Tower', TowerSchema);
