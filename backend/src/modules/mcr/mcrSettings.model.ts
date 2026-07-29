import mongoose, { Document, Model, Schema } from 'mongoose';

export interface IMcrSettingsDocument extends Document {
  societyId: string;
  financialYearStartMonth: number;
  defaultCurrency: string;
  societyTimezone: string;
  receiptPrefix: string;
  demandNumberPrefix: string;
  defaultDueDays: number;
  gracePeriodDays: number;
  lateFeeEnabled: boolean;
  lateFeeAmountPaise: number;
  lateFeeIntervalDays: number;
  makerCheckerEnabled: boolean;
  allowSelfVerification: boolean;
  allowAdvancePayment: boolean;
  allowPartialPayment: boolean;
  allowResidentPaymentSubmission: boolean;
  publicReceiptVerificationEnabled: boolean;
  collectionUpiId: string;
  collectionUpiPayeeName: string;
  updatedBy: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const McrSettingsSchema = new Schema(
  {
    societyId: { type: Schema.Types.ObjectId, ref: 'Society', required: true, unique: true },
    financialYearStartMonth: { type: Number, default: 4 },
    defaultCurrency: { type: String, default: 'INR' },
    societyTimezone: { type: String, default: 'Asia/Kolkata' },
    receiptPrefix: { type: String, default: 'MCR' },
    demandNumberPrefix: { type: String, default: 'MCRD' },
    defaultDueDays: { type: Number, default: 15 },
    gracePeriodDays: { type: Number, default: 0 },
    lateFeeEnabled: { type: Boolean, default: false },
    lateFeeAmountPaise: { type: Number, default: 0 },
    lateFeeIntervalDays: { type: Number, default: 30 },
    makerCheckerEnabled: { type: Boolean, default: true },
    allowSelfVerification: { type: Boolean, default: false },
    allowAdvancePayment: { type: Boolean, default: true },
    allowPartialPayment: { type: Boolean, default: true },
    allowResidentPaymentSubmission: { type: Boolean, default: false },
    publicReceiptVerificationEnabled: { type: Boolean, default: false },
    collectionUpiId: { type: String, trim: true, default: '' },
    collectionUpiPayeeName: { type: String, trim: true, default: '' },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

export const McrSettings: Model<IMcrSettingsDocument> = mongoose.model<IMcrSettingsDocument>(
  'McrSettings',
  McrSettingsSchema
);
