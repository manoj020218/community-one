import mongoose, { Schema, Document, Model } from 'mongoose';

export type FloorType = 'BASEMENT' | 'GROUND' | 'TYPICAL' | 'TERRACE' | 'OTHER';

export interface IFloorDocument extends Document {
  societyId: string;
  towerId: string;
  floorNumber: number;
  floorName: string;
  floorType: FloorType;
  flatNumberPrefix?: string;
  totalFlats: number;
  status: 'ACTIVE' | 'INACTIVE';
  createdBy: string;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

const FloorSchema = new Schema(
  {
    societyId: { type: Schema.Types.ObjectId, ref: 'Society', required: true },
    towerId: { type: Schema.Types.ObjectId, ref: 'Tower', required: true },
    // Ground floor is 0, basements are negative (-1, -2, ...), typical floors are 1..N.
    // This lets "number of floors" for a tower mean typical/residential floors only —
    // Ground and Basement are separate, explicit floors that never get silently folded in.
    floorNumber: { type: Number, required: true },
    floorName: { type: String, required: true, trim: true },
    floorType: { type: String, enum: ['BASEMENT', 'GROUND', 'TYPICAL', 'TERRACE', 'OTHER'], default: 'TYPICAL' },
    // Prefix used when auto-generating flat numbers on this floor (e.g. "G", "B1", "1", "2").
    // Falls back to `${towerCode}-${floorNumber}` when unset, for backward compatibility.
    flatNumberPrefix: { type: String, trim: true },
    totalFlats: { type: Number, default: 0 },
    status: { type: String, enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

FloorSchema.index({ towerId: 1, floorNumber: 1 }, { unique: true });
FloorSchema.index({ societyId: 1 });

export const Floor: Model<IFloorDocument> = mongoose.model<IFloorDocument>('Floor', FloorSchema);
