import mongoose, { Document, Model, Schema } from 'mongoose';

export interface IHouseholdRateCardDocument extends Document {
  societyId: string;
  associationId: string;
  staffProfileId: string;
  flatId: string;
  residentId: string;
  monthlyRatePaise: number;
  overtimeRatePaise?: number;
  effectiveFrom: Date;
  effectiveTo?: Date;
  notes?: string;
  isActive: boolean;
  createdBy: string;
  updatedBy: string;
}

const HouseholdRateCardSchema = new Schema(
  {
    societyId: { type: Schema.Types.ObjectId, ref: 'Society', required: true },
    associationId: { type: Schema.Types.ObjectId, ref: 'HouseholdAssociation', required: true },
    staffProfileId: { type: Schema.Types.ObjectId, ref: 'StaffProfile', required: true },
    flatId: { type: Schema.Types.ObjectId, ref: 'Flat', required: true },
    residentId: { type: Schema.Types.ObjectId, ref: 'Resident', required: true },
    monthlyRatePaise: { type: Number, min: 0, required: true },
    overtimeRatePaise: { type: Number, min: 0 },
    effectiveFrom: { type: Date, required: true },
    effectiveTo: { type: Date },
    notes: { type: String, trim: true },
    isActive: { type: Boolean, default: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

HouseholdRateCardSchema.index({ societyId: 1, associationId: 1, effectiveFrom: -1 });

export const HouseholdRateCard: Model<IHouseholdRateCardDocument> =
  mongoose.model<IHouseholdRateCardDocument>('HouseholdRateCard', HouseholdRateCardSchema);
