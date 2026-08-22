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
  reminderAutomationEnabled: boolean;
  reminderFrequencyDays: number;
  reminderTimeOfDay: string;
  reminderLastRunDate?: string;
  vacantFlatPolicy: 'BILL_FULL' | 'BILL_REDUCED' | 'EXEMPT';
  vacantFlatReducedPercent: number;
  unsoldFlatPolicy: 'BILL_FULL' | 'BILL_REDUCED' | 'EXEMPT';
  unsoldFlatReducedPercent: number;
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
    reminderAutomationEnabled: { type: Boolean, default: false },
    reminderFrequencyDays: { type: Number, default: 1 },
    reminderTimeOfDay: { type: String, default: '10:00' },
    reminderLastRunDate: { type: String, trim: true },
    // Vacant: a flat with a private owner but nobody currently living there — most society
    // bylaws still hold the owner liable for their share of upkeep, so BILL_FULL is the
    // default. Unsold: builder inventory not yet handed over to a buyer — conventionally
    // exempted since there's no owner yet, so EXEMPT is the default. EXEMPT never skips
    // generation outright — a demand is still created (kept in DRAFT / withheld from
    // auto-publish) so there's a clean accrual trail instead of a surprise lump-sum bill
    // whenever the flat is finally occupied or sold.
    vacantFlatPolicy: { type: String, enum: ['BILL_FULL', 'BILL_REDUCED', 'EXEMPT'], default: 'BILL_FULL' },
    vacantFlatReducedPercent: { type: Number, default: 50, min: 0, max: 100 },
    unsoldFlatPolicy: { type: String, enum: ['BILL_FULL', 'BILL_REDUCED', 'EXEMPT'], default: 'EXEMPT' },
    unsoldFlatReducedPercent: { type: Number, default: 50, min: 0, max: 100 },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

export const McrSettings: Model<IMcrSettingsDocument> = mongoose.model<IMcrSettingsDocument>(
  'McrSettings',
  McrSettingsSchema
);
