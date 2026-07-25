import mongoose, { Document, Model, Schema } from 'mongoose';

export interface IGuardAssignmentDocument extends Document {
  societyId: string;
  userId: string;
  gateIds: string[];
  shiftStart?: string;
  shiftEnd?: string;
  validFrom?: Date;
  validUntil?: Date;
  createdBy: string;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

const GuardAssignmentSchema = new Schema(
  {
    societyId: { type: Schema.Types.ObjectId, ref: 'Society', required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    gateIds: [{ type: Schema.Types.ObjectId, ref: 'Gate', required: true }],
    shiftStart: { type: String },
    shiftEnd: { type: String },
    validFrom: { type: Date },
    validUntil: { type: Date },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

GuardAssignmentSchema.index({ societyId: 1, userId: 1, isActive: 1 });
GuardAssignmentSchema.index({ societyId: 1, gateIds: 1, isActive: 1 });

export const GuardAssignment: Model<IGuardAssignmentDocument> = mongoose.model<IGuardAssignmentDocument>(
  'GuardAssignment',
  GuardAssignmentSchema
);
