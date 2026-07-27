import mongoose, { Document, Model, Schema } from 'mongoose';
import { MCR_NOTIFICATION_CHANNELS, MCR_NOTIFICATION_STATUSES } from './mcrDomain.types';

export interface IMcrNotificationDispatchDocument extends Document {
  societyId: string;
  eventType: string;
  entityType: string;
  entityId: string;
  flatId?: string;
  residentId?: string;
  channel: string;
  destinationMasked?: string;
  status: string;
  attemptCount?: number;
  failureMessage?: string;
  idempotencyKey?: string;
  sentAt?: Date;
  failedAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

const McrNotificationDispatchSchema = new Schema(
  {
    societyId: { type: Schema.Types.ObjectId, ref: 'Society', required: true },
    eventType: { type: String, required: true, trim: true },
    entityType: { type: String, required: true, trim: true },
    entityId: { type: String, required: true, trim: true },
    flatId: { type: Schema.Types.ObjectId, ref: 'Flat' },
    residentId: { type: Schema.Types.ObjectId, ref: 'Resident' },
    channel: { type: String, enum: MCR_NOTIFICATION_CHANNELS, required: true },
    destinationMasked: { type: String, trim: true },
    templateId: { type: String, trim: true },
    templateVersion: { type: String, trim: true },
    provider: { type: String, trim: true },
    providerMessageId: { type: String, trim: true },
    status: { type: String, enum: MCR_NOTIFICATION_STATUSES, default: 'QUEUED' },
    attemptCount: { type: Number, default: 0, min: 0 },
    lastAttemptAt: { type: Date },
    sentAt: { type: Date },
    deliveredAt: { type: Date },
    failedAt: { type: Date },
    failureCode: { type: String, trim: true },
    failureMessage: { type: String, trim: true },
    idempotencyKey: { type: String, trim: true },
  },
  { timestamps: true }
);

McrNotificationDispatchSchema.index({ societyId: 1, idempotencyKey: 1 }, { unique: true, sparse: true });
McrNotificationDispatchSchema.index({ societyId: 1, status: 1, eventType: 1 });
McrNotificationDispatchSchema.index({ societyId: 1, entityType: 1, entityId: 1 });

export const McrNotificationDispatch: Model<IMcrNotificationDispatchDocument> = mongoose.model<IMcrNotificationDispatchDocument>(
  'McrNotificationDispatch',
  McrNotificationDispatchSchema
);
