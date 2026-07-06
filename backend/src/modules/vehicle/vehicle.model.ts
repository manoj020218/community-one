import mongoose, { Schema, Document, Model } from 'mongoose';

export type VehicleType = 'CAR'|'BIKE'|'SCOOTER'|'CYCLE'|'COMMERCIAL'|'STAFF'|'VISITOR'|'OTHER';

export interface IVehicleDocument extends Document {
  societyId: string;
  flatId: string;
  memberId?: string;
  vehicleNo: string;
  vehicleType: VehicleType;
  brand?: string;
  vehicleModel?: string;
  color?: string;
  parkingSlot?: string;
  uhfTagId?: string;
  rfidCardId?: string;
  stickerNo?: string;
  entryAllowed: boolean;
  isBlacklisted: boolean;
  status: 'ACTIVE' | 'INACTIVE';
  createdBy: string;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

const VehicleSchema = new Schema(
  {
    societyId: { type: Schema.Types.ObjectId, ref: 'Society', required: true },
    flatId: { type: Schema.Types.ObjectId, ref: 'Flat', required: true },
    memberId: { type: Schema.Types.ObjectId, ref: 'Resident' },
    vehicleNo: { type: String, required: true, uppercase: true, trim: true },
    vehicleType: { type: String, enum: ['CAR','BIKE','SCOOTER','CYCLE','COMMERCIAL','STAFF','VISITOR','OTHER'], required: true },
    brand: { type: String },
    vehicleModel: { type: String },
    color: { type: String },
    parkingSlot: { type: String },
    uhfTagId: { type: String },
    rfidCardId: { type: String },
    stickerNo: { type: String },
    entryAllowed: { type: Boolean, default: true },
    isBlacklisted: { type: Boolean, default: false },
    status: { type: String, enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

VehicleSchema.index({ societyId: 1, vehicleNo: 1 }, { unique: true });
VehicleSchema.index({ flatId: 1 });

export const Vehicle: Model<IVehicleDocument> = mongoose.model<IVehicleDocument>('Vehicle', VehicleSchema);
