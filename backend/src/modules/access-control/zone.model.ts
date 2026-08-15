import mongoose, { Document, Model, Schema } from 'mongoose';
import { ZoneType } from './access-control.types';

export interface IZoneDocument extends Document {
  societyId: string;
  name: string;
  zoneType: ZoneType;
  description?: string;
  linkedGateId?: string;
  createdBy: string;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

const ZoneSchema = new Schema(
  {
    societyId: { type: Schema.Types.ObjectId, ref: 'Society', required: true },
    name: { type: String, required: true, trim: true },
    zoneType: { type: String, enum: ['GATE', 'GYM', 'POOL', 'SPA', 'ROOM_BLOCK', 'OTHER'], required: true },
    description: { type: String, trim: true },
    linkedGateId: { type: Schema.Types.ObjectId, ref: 'Gate' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

ZoneSchema.index({ societyId: 1, isActive: 1 });

export const Zone: Model<IZoneDocument> = mongoose.model<IZoneDocument>('Zone', ZoneSchema);
