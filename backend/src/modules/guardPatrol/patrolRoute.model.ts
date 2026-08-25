import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IPatrolRouteDocument extends Document {
  societyId: string;
  name: string;
  checkpointIds: string[];
  alertThresholdMinutes?: number;
  isActive: boolean;
  createdBy: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const PatrolRouteSchema = new Schema(
  {
    societyId: { type: Schema.Types.ObjectId, ref: 'Society', required: true },
    name: { type: String, required: true, trim: true },
    // Order matters — this is the sequence a guard is expected to walk, not just a set.
    checkpointIds: [{ type: Schema.Types.ObjectId, ref: 'PatrolCheckpoint', required: true }],
    // Overrides the society default (GuardPatrol module settings) when set.
    alertThresholdMinutes: { type: Number, min: 1 },
    isActive: { type: Boolean, default: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

PatrolRouteSchema.index({ societyId: 1, isActive: 1 });

export const PatrolRoute: Model<IPatrolRouteDocument> = mongoose.model<IPatrolRouteDocument>('PatrolRoute', PatrolRouteSchema);
