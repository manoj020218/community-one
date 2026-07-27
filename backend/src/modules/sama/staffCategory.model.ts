import mongoose, { Document, Model, Schema } from 'mongoose';

export interface IStaffCategoryDocument extends Document {
  societyId: string;
  code: string;
  name: string;
  staffTypes: string[];
  description?: string;
  defaultMonthlyRatePaise?: number;
  requiresSocietyApproval: boolean;
  isActive: boolean;
  createdBy: string;
  updatedBy: string;
}

const StaffCategorySchema = new Schema(
  {
    societyId: { type: Schema.Types.ObjectId, ref: 'Society', required: true },
    code: { type: String, required: true, trim: true, uppercase: true },
    name: { type: String, required: true, trim: true },
    staffTypes: { type: [String], default: [] },
    description: { type: String, trim: true },
    defaultMonthlyRatePaise: { type: Number, min: 0 },
    requiresSocietyApproval: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

StaffCategorySchema.index({ societyId: 1, code: 1 }, { unique: true });

export const StaffCategory: Model<IStaffCategoryDocument> =
  mongoose.model<IStaffCategoryDocument>('StaffCategory', StaffCategorySchema);
