import mongoose, { Schema, Document, Model } from 'mongoose';

export type FlatType = '1BHK'|'2BHK'|'3BHK'|'4BHK'|'PENTHOUSE'|'VILLA'|'SHOP'|'OFFICE'|'OTHER';
export type OccupancyStatus = 'OWNER_OCCUPIED'|'TENANT_OCCUPIED'|'VACANT'|'LOCKED'|'UNDER_RENOVATION';

export interface IFlatDocument extends Document {
  societyId: string;
  towerId: string;
  floorId: string;
  flatNo: string;
  flatType: FlatType;
  areaSqFt?: number;
  occupancyStatus: OccupancyStatus;
  maintenanceCategory?: string;
  parkingSlots: number;
  status: 'ACTIVE' | 'INACTIVE';
  createdBy: string;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

const FlatSchema = new Schema(
  {
    societyId: { type: Schema.Types.ObjectId, ref: 'Society', required: true },
    towerId: { type: Schema.Types.ObjectId, ref: 'Tower', required: true },
    floorId: { type: Schema.Types.ObjectId, ref: 'Floor', required: true },
    flatNo: { type: String, required: true, trim: true },
    flatType: {
      type: String,
      enum: ['1BHK','2BHK','3BHK','4BHK','PENTHOUSE','VILLA','SHOP','OFFICE','OTHER'],
      default: '2BHK',
    },
    areaSqFt: { type: Number },
    occupancyStatus: {
      type: String,
      enum: ['OWNER_OCCUPIED','TENANT_OCCUPIED','VACANT','LOCKED','UNDER_RENOVATION'],
      default: 'VACANT',
    },
    maintenanceCategory: { type: String },
    parkingSlots: { type: Number, default: 0 },
    status: { type: String, enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

FlatSchema.index({ societyId: 1, flatNo: 1 }, { unique: true });
FlatSchema.index({ towerId: 1, floorId: 1 });

export const Flat: Model<IFlatDocument> = mongoose.model<IFlatDocument>('Flat', FlatSchema);
