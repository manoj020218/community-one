import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IFloorDocument extends Document {
  societyId: string;
  towerId: string;
  floorNumber: number;
  floorName: string;
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
    floorNumber: { type: Number, required: true },
    floorName: { type: String, required: true, trim: true },
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
