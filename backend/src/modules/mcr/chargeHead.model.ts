import mongoose, { Document, Model, Schema } from 'mongoose';

export interface IChargeHeadDocument extends Document {
  societyId: string;
  code: string;
  name: string;
  description?: string;
  category: string;
  isRecurring: boolean;
  defaultAmountPaise: number;
  calculationMethod: string;
  isActive: boolean;
  displayOrder: number;
  effectiveFrom?: Date;
  effectiveTo?: Date;
  createdBy: string;
  updatedBy: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const ChargeHeadSchema = new Schema(
  {
    societyId: { type: Schema.Types.ObjectId, ref: 'Society', required: true },
    code: { type: String, required: true, uppercase: true, trim: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    category: { type: String, required: true },
    isRecurring: { type: Boolean, default: true },
    defaultAmountPaise: { type: Number, required: true, min: 0 },
    calculationMethod: { type: String, required: true },
    isActive: { type: Boolean, default: true },
    displayOrder: { type: Number, default: 0 },
    effectiveFrom: { type: Date },
    effectiveTo: { type: Date },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

ChargeHeadSchema.index({ societyId: 1, code: 1 }, { unique: true });
ChargeHeadSchema.index({ societyId: 1, isActive: 1, displayOrder: 1 });

export const ChargeHead: Model<IChargeHeadDocument> = mongoose.model<IChargeHeadDocument>(
  'ChargeHead',
  ChargeHeadSchema
);
