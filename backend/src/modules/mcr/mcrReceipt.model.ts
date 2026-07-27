import mongoose, { Document, Model, Schema } from 'mongoose';
import { MCR_RECEIPT_STATUSES } from './mcrDomain.types';
import {
  AllocationSnapshotSchema,
  PaymentSnapshotSchema,
  ResidentSnapshotSchema,
} from './mcrShared.schemas';

export interface IMcrReceiptDocument extends Document {
  societyId: string;
  receiptNumber: string;
  paymentId: string;
  flatId: string;
  residentId?: string;
  residentSnapshot: { name: string; mobile?: string; email?: string };
  paymentSnapshot: { payerName: string; paymentMethod: string; paymentDate: Date; amountPaise: number };
  allocationSnapshot: Array<{
    demandId: string;
    demandNumber: string;
    allocatedAmountPaise: number;
  }>;
  amountPaise: number;
  advanceAmountPaise: number;
  issuedBy: string;
  status: string;
  issuedAt: Date;
  pdfChecksum?: string;
  templateVersion?: string;
  publicVerificationTokenHash?: string;
  voidedAt?: Date;
  voidedBy?: string;
  voidReason?: string;
  replacementReceiptId?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const McrReceiptSchema = new Schema(
  {
    societyId: { type: Schema.Types.ObjectId, ref: 'Society', required: true },
    receiptNumber: { type: String, required: true, trim: true },
    paymentId: { type: Schema.Types.ObjectId, ref: 'McrPaymentRecord', required: true },
    flatId: { type: Schema.Types.ObjectId, ref: 'Flat', required: true },
    residentId: { type: Schema.Types.ObjectId, ref: 'Resident' },
    residentSnapshot: { type: ResidentSnapshotSchema, required: true },
    paymentSnapshot: { type: PaymentSnapshotSchema, required: true },
    allocationSnapshot: { type: [AllocationSnapshotSchema], default: [] },
    amountPaise: { type: Number, required: true, min: 0 },
    advanceAmountPaise: { type: Number, default: 0, min: 0 },
    issuedAt: { type: Date, required: true },
    issuedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    status: { type: String, enum: MCR_RECEIPT_STATUSES, default: 'ISSUED' },
    pdfFileId: { type: Schema.Types.ObjectId, ref: 'FileAsset' },
    pdfChecksum: { type: String, trim: true },
    templateVersion: { type: String, trim: true, default: '1.0.0' },
    publicVerificationTokenHash: { type: String, trim: true },
    voidedAt: { type: Date },
    voidedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    voidReason: { type: String, trim: true },
    replacementReceiptId: { type: Schema.Types.ObjectId, ref: 'McrReceipt' },
  },
  { timestamps: true }
);

McrReceiptSchema.index({ societyId: 1, receiptNumber: 1 }, { unique: true });
McrReceiptSchema.index({ societyId: 1, paymentId: 1, status: 1 });

export const McrReceipt: Model<IMcrReceiptDocument> = mongoose.model<IMcrReceiptDocument>(
  'McrReceipt',
  McrReceiptSchema
);
