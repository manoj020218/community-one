import mongoose, { Document, Model, Schema } from 'mongoose';

export interface IParentWardLinkDocument extends Document {
  societyId: string;
  userId: string;
  residentIds: string[];
  createdBy: string;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

const ParentWardLinkSchema = new Schema(
  {
    societyId: { type: Schema.Types.ObjectId, ref: 'Society', required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    residentIds: [{ type: Schema.Types.ObjectId, ref: 'Resident', required: true }],
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

ParentWardLinkSchema.index({ societyId: 1, userId: 1, isActive: 1 });
ParentWardLinkSchema.index({ residentIds: 1, isActive: 1 });

export const ParentWardLink: Model<IParentWardLinkDocument> = mongoose.model<IParentWardLinkDocument>(
  'ParentWardLink',
  ParentWardLinkSchema
);
