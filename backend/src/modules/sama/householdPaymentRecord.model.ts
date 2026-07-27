import mongoose, { Document, Model, Schema } from 'mongoose';

export interface IHouseholdPaymentRecordDocument extends Document {
  societyId: string;
  associationId: string;
  rateCardId?: string;
  staffProfileId: string;
  flatId: string;
  residentId: string;
  billingMonth: string;
  duePaise: number;
  paidPaise: number;
  status: 'DUE' | 'PARTIAL' | 'PAID' | 'WAIVED';
  paymentMethod?: string;
  paidAt?: Date;
  notes?: string;
  receiptRef?: string;
  createdBy: string;
  updatedBy: string;
}

const HouseholdPaymentRecordSchema = new Schema(
  {
    societyId: { type: Schema.Types.ObjectId, ref: 'Society', required: true },
    associationId: { type: Schema.Types.ObjectId, ref: 'HouseholdAssociation', required: true },
    rateCardId: { type: Schema.Types.ObjectId, ref: 'HouseholdRateCard' },
    staffProfileId: { type: Schema.Types.ObjectId, ref: 'StaffProfile', required: true },
    flatId: { type: Schema.Types.ObjectId, ref: 'Flat', required: true },
    residentId: { type: Schema.Types.ObjectId, ref: 'Resident', required: true },
    billingMonth: { type: String, required: true, trim: true },
    duePaise: { type: Number, min: 0, required: true },
    paidPaise: { type: Number, min: 0, default: 0 },
    status: { type: String, enum: ['DUE', 'PARTIAL', 'PAID', 'WAIVED'], default: 'DUE' },
    paymentMethod: { type: String, trim: true },
    paidAt: { type: Date },
    notes: { type: String, trim: true },
    receiptRef: { type: String, trim: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

HouseholdPaymentRecordSchema.index({ societyId: 1, associationId: 1, billingMonth: 1 }, { unique: true });
HouseholdPaymentRecordSchema.index({ societyId: 1, flatId: 1, status: 1 });

export const HouseholdPaymentRecord: Model<IHouseholdPaymentRecordDocument> =
  mongoose.model<IHouseholdPaymentRecordDocument>('HouseholdPaymentRecord', HouseholdPaymentRecordSchema);
