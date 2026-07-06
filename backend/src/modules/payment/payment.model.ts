import mongoose, { Schema, Document, Model } from 'mongoose';

export type PaymentMode = 'CASH'|'UPI'|'BANK_TRANSFER'|'CHEQUE'|'ONLINE_GATEWAY'|'ADJUSTMENT'|'WAIVER';
export type PaymentStatus = 'PENDING'|'RECEIVED'|'FAILED'|'CANCELLED'|'REFUNDED';

export interface IPaymentRecordDocument extends Document {
  societyId: string;
  flatId: string;
  memberId?: string;
  amount: number;
  currency: string;
  paymentPurpose: string;
  moduleCode: string;
  paymentMode: PaymentMode;
  paymentStatus: PaymentStatus;
  transactionId?: string;
  paymentDate: Date;
  receivedBy?: string;
  attachmentFileId?: string;
  remarks?: string;
  createdBy: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const PaymentRecordSchema = new Schema(
  {
    societyId: { type: Schema.Types.ObjectId, ref: 'Society', required: true },
    flatId: { type: Schema.Types.ObjectId, ref: 'Flat', required: true },
    memberId: { type: Schema.Types.ObjectId, ref: 'Resident' },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'INR' },
    paymentPurpose: { type: String, required: true },
    moduleCode: { type: String, default: 'CORE' },
    paymentMode: { type: String, enum: ['CASH','UPI','BANK_TRANSFER','CHEQUE','ONLINE_GATEWAY','ADJUSTMENT','WAIVER'], required: true },
    paymentStatus: { type: String, enum: ['PENDING','RECEIVED','FAILED','CANCELLED','REFUNDED'], default: 'RECEIVED' },
    transactionId: { type: String },
    paymentDate: { type: Date, default: Date.now },
    receivedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    attachmentFileId: { type: Schema.Types.ObjectId, ref: 'FileAsset' },
    remarks: { type: String },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

PaymentRecordSchema.index({ societyId: 1, paymentDate: -1 });
PaymentRecordSchema.index({ flatId: 1 });

export const PaymentRecord: Model<IPaymentRecordDocument> = mongoose.model<IPaymentRecordDocument>(
  'PaymentRecord',
  PaymentRecordSchema
);
