import mongoose, { Document, Model, Schema } from 'mongoose';
import { LeaseStatus } from './lease.types';

export interface ILeaseDocument extends Document {
  societyId: string;
  flatId: string;
  residentId: string;
  rentAmount: number;
  depositAmount: number;
  depositRefundAmount?: number;
  depositRefundedAt?: Date;
  billingDay: number;
  startDate: Date;
  endDate: Date;
  noticePeriodDays: number;
  status: LeaseStatus;
  terminationDate?: Date;
  terminationReason?: string;
  remarks?: string;
  createdBy: string;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

const LeaseSchema = new Schema(
  {
    societyId: { type: Schema.Types.ObjectId, ref: 'Society', required: true },
    flatId: { type: Schema.Types.ObjectId, ref: 'Flat', required: true },
    residentId: { type: Schema.Types.ObjectId, ref: 'Resident', required: true },
    rentAmount: { type: Number, required: true, min: 0 },
    depositAmount: { type: Number, default: 0, min: 0 },
    depositRefundAmount: { type: Number, min: 0 },
    depositRefundedAt: { type: Date },
    billingDay: { type: Number, required: true, min: 1, max: 28 },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    noticePeriodDays: { type: Number, default: 30, min: 0 },
    status: { type: String, enum: ['ACTIVE', 'EXPIRED', 'TERMINATED', 'RENEWED'], default: 'ACTIVE' },
    terminationDate: { type: Date },
    terminationReason: { type: String, trim: true },
    remarks: { type: String, trim: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

LeaseSchema.index({ societyId: 1, status: 1 });
LeaseSchema.index({ flatId: 1 });
LeaseSchema.index({ residentId: 1 });

export const Lease: Model<ILeaseDocument> = mongoose.model<ILeaseDocument>('Lease', LeaseSchema);
