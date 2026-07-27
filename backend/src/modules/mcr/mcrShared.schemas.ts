import { Schema } from 'mongoose';

export const ResidentSnapshotSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    mobile: { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true },
  },
  { _id: false }
);

export const FlatSnapshotSchema = new Schema(
  {
    flatNo: { type: String, required: true, trim: true },
    towerId: { type: Schema.Types.ObjectId, ref: 'Tower' },
    towerName: { type: String, trim: true },
  },
  { _id: false }
);

export const BillingPeriodSchema = new Schema(
  {
    key: { type: String, required: true, trim: true },
    label: { type: String, required: true, trim: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
  },
  { _id: false }
);

export const ChargeLineSnapshotSchema = new Schema(
  {
    chargeHeadId: { type: Schema.Types.ObjectId, ref: 'ChargeHead' },
    code: { type: String, required: true, trim: true },
    name: { type: String, required: true, trim: true },
    category: { type: String, required: true, trim: true },
    amountPaise: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

export const AllocationSnapshotSchema = new Schema(
  {
    demandId: { type: Schema.Types.ObjectId, ref: 'MaintenanceDemand', required: true },
    demandNumber: { type: String, required: true, trim: true },
    allocatedAmountPaise: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

export const PaymentSnapshotSchema = new Schema(
  {
    payerName: { type: String, required: true, trim: true },
    paymentMethod: { type: String, required: true, trim: true },
    paymentDate: { type: Date, required: true },
    amountPaise: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);
