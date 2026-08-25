import mongoose, { Schema, Document, Model } from 'mongoose';

export type PatrolRoundStatus = 'IN_PROGRESS' | 'COMPLETED' | 'ABANDONED';

export interface IPatrolRoundDocument extends Document {
  societyId: string;
  routeId: string;
  guardUserId: string;
  startedAt: Date;
  completedAt?: Date;
  status: PatrolRoundStatus;
  createdAt?: Date;
  updatedAt?: Date;
}

const PatrolRoundSchema = new Schema(
  {
    societyId: { type: Schema.Types.ObjectId, ref: 'Society', required: true },
    routeId: { type: Schema.Types.ObjectId, ref: 'PatrolRoute', required: true },
    guardUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    startedAt: { type: Date, required: true },
    completedAt: { type: Date },
    status: { type: String, enum: ['IN_PROGRESS', 'COMPLETED', 'ABANDONED'], default: 'IN_PROGRESS' },
  },
  { timestamps: true }
);

PatrolRoundSchema.index({ societyId: 1, guardUserId: 1, status: 1 });
PatrolRoundSchema.index({ societyId: 1, routeId: 1, startedAt: -1 });

export const PatrolRound: Model<IPatrolRoundDocument> = mongoose.model<IPatrolRoundDocument>('PatrolRound', PatrolRoundSchema);
