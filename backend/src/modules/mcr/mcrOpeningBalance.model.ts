import mongoose, { Document, Model, Schema } from 'mongoose';

export interface IMcrOpeningBalanceDocument extends Document {
  societyId: string;
  asOfDate: Date;
  openingCashPaise: number;
  openingBankPaise: number;
  systemBillingPlanId?: string;
  systemChargeHeadId?: string;
  createdBy: string;
  updatedBy: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const McrOpeningBalanceSchema = new Schema(
  {
    societyId: { type: Schema.Types.ObjectId, ref: 'Society', required: true, unique: true },
    asOfDate: { type: Date, required: true },
    openingCashPaise: { type: Number, default: 0, min: 0 },
    openingBankPaise: { type: Number, default: 0, min: 0 },
    // Lazily created the first time bulkCreateOpeningDues() runs — a hidden BillingPlan/
    // ChargeHead pair so legacy-dues demands can reuse the normal demand pipeline (payment
    // allocation, receipts, reports) without billingPlanId ever needing to be optional.
    systemBillingPlanId: { type: Schema.Types.ObjectId, ref: 'BillingPlan' },
    systemChargeHeadId: { type: Schema.Types.ObjectId, ref: 'ChargeHead' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

export const McrOpeningBalance: Model<IMcrOpeningBalanceDocument> = mongoose.model<IMcrOpeningBalanceDocument>(
  'McrOpeningBalance',
  McrOpeningBalanceSchema
);
