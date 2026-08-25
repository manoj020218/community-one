import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IPatrolAssignmentDocument extends Document {
  societyId: string;
  userId: string;
  routeId: string;
  shiftStart?: string;
  shiftEnd?: string;
  validFrom?: Date;
  validUntil?: Date;
  isActive: boolean;
  createdBy: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const PatrolAssignmentSchema = new Schema(
  {
    societyId: { type: Schema.Types.ObjectId, ref: 'Society', required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    routeId: { type: Schema.Types.ObjectId, ref: 'PatrolRoute', required: true },
    shiftStart: { type: String }, // "HH:mm", mirrors GuardAssignment's shape
    shiftEnd: { type: String },
    validFrom: { type: Date },
    validUntil: { type: Date },
    isActive: { type: Boolean, default: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

PatrolAssignmentSchema.index({ societyId: 1, userId: 1, isActive: 1 });

export const PatrolAssignment: Model<IPatrolAssignmentDocument> = mongoose.model<IPatrolAssignmentDocument>('PatrolAssignment', PatrolAssignmentSchema);
