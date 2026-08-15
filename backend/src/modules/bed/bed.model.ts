import mongoose, { Document, Model, Schema } from 'mongoose';
import { BedStatus } from './bed.types';

export interface IBedDocument extends Document {
  societyId: string;
  flatId: string;
  bedNumber: string;
  status: BedStatus;
  assignedResidentId?: string;
  createdBy: string;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

const BedSchema = new Schema(
  {
    societyId: { type: Schema.Types.ObjectId, ref: 'Society', required: true },
    flatId: { type: Schema.Types.ObjectId, ref: 'Flat', required: true },
    bedNumber: { type: String, required: true, trim: true },
    status: { type: String, enum: ['VACANT', 'OCCUPIED', 'MAINTENANCE', 'RESERVED'], default: 'VACANT' },
    assignedResidentId: { type: Schema.Types.ObjectId, ref: 'Resident' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

BedSchema.index({ flatId: 1, bedNumber: 1 }, { unique: true });
BedSchema.index({ societyId: 1 });

export const Bed: Model<IBedDocument> = mongoose.model<IBedDocument>('Bed', BedSchema);
