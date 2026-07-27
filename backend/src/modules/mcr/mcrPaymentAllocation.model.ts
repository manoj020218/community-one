import mongoose, { Document, Model, Schema } from 'mongoose';
import { MCR_PAYMENT_ALLOCATION_TYPES } from './mcrDomain.types';

export interface IMcrPaymentAllocationDocument extends Document {
  societyId: string;
  paymentId: string;
  demandId: string;
  allocatedAmountPaise: number;
  allocationType: string;
  createdBy: string;
  reversedAt?: Date;
  reversedBy?: string;
  reversalReason?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const McrPaymentAllocationSchema = new Schema(
  {
    societyId: { type: Schema.Types.ObjectId, ref: 'Society', required: true },
    paymentId: { type: Schema.Types.ObjectId, ref: 'McrPaymentRecord', required: true },
    demandId: { type: Schema.Types.ObjectId, ref: 'MaintenanceDemand', required: true },
    allocatedAmountPaise: { type: Number, required: true, min: 0 },
    allocationType: { type: String, enum: MCR_PAYMENT_ALLOCATION_TYPES, default: 'MANUAL' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    reversedAt: { type: Date },
    reversedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    reversalReason: { type: String, trim: true },
  },
  { timestamps: true }
);

McrPaymentAllocationSchema.index({ societyId: 1, paymentId: 1, demandId: 1 }, { unique: true });
McrPaymentAllocationSchema.index({ societyId: 1, demandId: 1, createdAt: -1 });

export const McrPaymentAllocation: Model<IMcrPaymentAllocationDocument> = mongoose.model<IMcrPaymentAllocationDocument>(
  'McrPaymentAllocation',
  McrPaymentAllocationSchema
);
