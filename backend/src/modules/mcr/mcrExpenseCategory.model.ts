import mongoose, { Document, Model, Schema } from 'mongoose';

export interface IMcrExpenseCategoryDocument extends Document {
  societyId: string;
  name: string;
  isActive: boolean;
  createdBy: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const McrExpenseCategorySchema = new Schema(
  {
    societyId: { type: Schema.Types.ObjectId, ref: 'Society', required: true },
    name: { type: String, required: true, trim: true },
    isActive: { type: Boolean, default: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

McrExpenseCategorySchema.index({ societyId: 1, name: 1 }, { unique: true, collation: { locale: 'en', strength: 2 } });

export const McrExpenseCategory: Model<IMcrExpenseCategoryDocument> = mongoose.model<IMcrExpenseCategoryDocument>(
  'McrExpenseCategory',
  McrExpenseCategorySchema
);
