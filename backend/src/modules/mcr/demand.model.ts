import mongoose, { Document, Model, Schema } from 'mongoose';

interface DemandChargeLine {
  chargeHeadId: string;
  chargeCode: string;
  chargeName: string;
  amountPaise: number;
  calculationMethod: string;
}

export interface IMaintenanceDemandDocument extends Document {
  societyId: string;
  billingPlanId: string;
  demandNumber?: string;
  flatId: string;
  demandType: 'REGULAR' | 'LATE_FEE';
  parentDemandId?: string;
  lateFeeCycleIndex?: number;
  billingPeriodKey: string;
  billingPeriodLabel: string;
  issueDate: Date;
  dueDate: Date;
  status: 'DRAFT' | 'PUBLISHED' | 'PARTIALLY_PAID' | 'PAID' | 'OVERDUE' | 'CANCELLED';
  chargeLines: DemandChargeLine[];
  flatSnapshot: Record<string, unknown>;
  residentSnapshot?: Record<string, unknown>;
  subtotalPaise: number;
  totalDemandPaise: number;
  advanceAppliedPaise: number;
  paidPaise: number;
  outstandingPaise: number;
  version: number;
  publishedAt?: Date;
  publishedBy?: string;
  ledgerEntryId?: string;
  createdBy: string;
  updatedBy: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const DemandChargeLineSchema = new Schema(
  {
    chargeHeadId: { type: Schema.Types.ObjectId, ref: 'ChargeHead', required: true },
    chargeCode: { type: String, required: true },
    chargeName: { type: String, required: true },
    amountPaise: { type: Number, required: true, min: 0 },
    calculationMethod: { type: String, required: true },
  },
  { _id: false }
);

const MaintenanceDemandSchema = new Schema(
  {
    societyId: { type: Schema.Types.ObjectId, ref: 'Society', required: true },
    billingPlanId: { type: Schema.Types.ObjectId, ref: 'BillingPlan', required: true },
    demandNumber: { type: String },
    flatId: { type: Schema.Types.ObjectId, ref: 'Flat', required: true },
    demandType: { type: String, enum: ['REGULAR', 'LATE_FEE'], default: 'REGULAR' },
    parentDemandId: { type: Schema.Types.ObjectId, ref: 'MaintenanceDemand' },
    lateFeeCycleIndex: { type: Number, min: 1 },
    billingPeriodKey: { type: String, required: true },
    billingPeriodLabel: { type: String, required: true },
    issueDate: { type: Date, required: true },
    dueDate: { type: Date, required: true },
    status: { type: String, enum: ['DRAFT', 'PUBLISHED', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'CANCELLED'], default: 'DRAFT' },
    chargeLines: { type: [DemandChargeLineSchema], required: true },
    flatSnapshot: { type: Schema.Types.Mixed, required: true },
    residentSnapshot: { type: Schema.Types.Mixed },
    subtotalPaise: { type: Number, required: true, min: 0 },
    totalDemandPaise: { type: Number, required: true, min: 0 },
    advanceAppliedPaise: { type: Number, default: 0, min: 0 },
    paidPaise: { type: Number, default: 0, min: 0 },
    outstandingPaise: { type: Number, required: true, min: 0 },
    version: { type: Number, default: 1 },
    publishedAt: { type: Date },
    publishedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    ledgerEntryId: { type: Schema.Types.ObjectId, ref: 'LedgerEntry' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

MaintenanceDemandSchema.index({ societyId: 1, flatId: 1, billingPlanId: 1, billingPeriodKey: 1, version: 1 }, { unique: true });
MaintenanceDemandSchema.index({ societyId: 1, status: 1, dueDate: 1 });
MaintenanceDemandSchema.index(
  { societyId: 1, parentDemandId: 1, lateFeeCycleIndex: 1 },
  {
    unique: true,
    partialFilterExpression: {
      parentDemandId: { $exists: true, $ne: null },
      lateFeeCycleIndex: { $exists: true, $ne: null },
    },
  }
);

export const MaintenanceDemand: Model<IMaintenanceDemandDocument> = mongoose.model<IMaintenanceDemandDocument>(
  'MaintenanceDemand',
  MaintenanceDemandSchema
);
