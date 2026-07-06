import mongoose, { Schema, Document, Model } from 'mongoose';

export type PetType = 'DOG' | 'CAT' | 'BIRD' | 'OTHER';

export interface IPetDocument extends Document {
  societyId: string;
  flatId?: string;
  residentId?: string;
  petName: string;
  petType: PetType;
  breed?: string;
  photoUrl?: string;
  vaccinationRecordUrl?: string;
  vaccinationExpiryDate?: Date;
  aggressiveFlag: boolean;
  remarks?: string;
  status: 'ACTIVE' | 'INACTIVE';
  createdBy: string;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

const PetSchema = new Schema(
  {
    societyId: { type: Schema.Types.ObjectId, ref: 'Society', required: true },
    flatId: { type: Schema.Types.ObjectId, ref: 'Flat' },
    residentId: { type: Schema.Types.ObjectId, ref: 'Resident' },
    petName: { type: String, required: true, trim: true },
    petType: { type: String, enum: ['DOG','CAT','BIRD','OTHER'], required: true },
    breed: { type: String },
    photoUrl: { type: String },
    vaccinationRecordUrl: { type: String },
    vaccinationExpiryDate: { type: Date },
    aggressiveFlag: { type: Boolean, default: false },
    remarks: { type: String },
    status: { type: String, enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

PetSchema.index({ societyId: 1 });
PetSchema.index({ flatId: 1 });

export const Pet: Model<IPetDocument> = mongoose.model<IPetDocument>('Pet', PetSchema);
