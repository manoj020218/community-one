import mongoose, { Schema, Document, Model } from 'mongoose';

export type FlatType = '1BHK'|'2BHK'|'3BHK'|'4BHK'|'PENTHOUSE'|'VILLA'|'SHOP'|'OFFICE'|'PARKING'|'STAFF_QUARTERS'|'OTHER';
export type OccupancyStatus = 'OWNER_OCCUPIED'|'TENANT_OCCUPIED'|'VACANT'|'LOCKED'|'UNDER_RENOVATION'|'BUILDER_UNSOLD';

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
      enum: ['1BHK','2BHK','3BHK','4BHK','PENTHOUSE','VILLA','SHOP','OFFICE','PARKING','STAFF_QUARTERS','OTHER'],
      default: '2BHK',
    },
    areaSqFt: { type: Number },
    occupancyStatus: {
      type: String,
      enum: ['OWNER_OCCUPIED','TENANT_OCCUPIED','VACANT','LOCKED','UNDER_RENOVATION','BUILDER_UNSOLD'],
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

// Unique per TOWER, not per society — flat numbers are auto-generated from floor prefix
// alone (G01, 101...), so two towers with the same floor structure produce identical flat
// numbers. Scoping uniqueness to the whole society meant the second tower's flats were
// silently unable to generate at all (the generator's own "already exists" check matched the
// first tower's flats). A flat's real identity is always tower + number together anyway.
// partialFilterExpression: a soft-deleted flat (isActive: false) no longer reserves its
// flat number, so an admin can delete a wrongly-created flat and immediately reuse the number.
FlatSchema.index({ towerId: 1, flatNo: 1 }, { unique: true, partialFilterExpression: { isActive: true } });
FlatSchema.index({ societyId: 1 });
FlatSchema.index({ towerId: 1, floorId: 1 });

export const Flat: Model<IFlatDocument> = mongoose.model<IFlatDocument>('Flat', FlatSchema);
