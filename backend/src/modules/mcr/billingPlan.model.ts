import mongoose, { Document, Model, Schema } from 'mongoose';

interface BillingPlanChargeLine {
  chargeHeadId: string;
  amountPaise: number;
  calculationMethod: string;
}

export interface IBillingPlanDocument extends Document {
  societyId: string;
  name: string;
  frequency: string;
  billingDay: number;
  dueDay: number;
  chargeLines: BillingPlanChargeLine[];
  effectiveFrom: Date;
  effectiveTo?: Date;
  autoGenerate: boolean;
  autoPublish: boolean;
  isActive: boolean;
  version: number;
  createdBy: string;
  updatedBy: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const ChargeLineSchema = new Schema(
  {
    chargeHeadId: { type: Schema.Types.ObjectId, ref: 'ChargeHead', required: true },
    amountPaise: { type: Number, required: true, min: 0 },
    calculationMethod: { type: String, required: true },
  },
  { _id: false }
);

const BillingPlanSchema = new Schema(
  {
    societyId: { type: Schema.Types.ObjectId, ref: 'Society', required: true },
    name: { type: String, required: true, trim: true },
    frequency: { type: String, required: true },
    billingDay: { type: Number, required: true },
    dueDay: { type: Number, required: true },
    chargeLines: { type: [ChargeLineSchema], required: true },
    effectiveFrom: { type: Date, required: true },
    effectiveTo: { type: Date },
    autoGenerate: { type: Boolean, default: false },
    autoPublish: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    version: { type: Number, default: 1 },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

BillingPlanSchema.index({ societyId: 1, name: 1 }, { unique: true });
BillingPlanSchema.index({ societyId: 1, isActive: 1, effectiveFrom: -1 });

export const BillingPlan: Model<IBillingPlanDocument> = mongoose.model<IBillingPlanDocument>(
  'BillingPlan',
  BillingPlanSchema
);
