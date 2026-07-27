import mongoose, { Document, Model, Schema } from 'mongoose';

export interface ISamaAccessEventDocument extends Document {
  societyId: string;
  sourceProvider: 'EDGEFOLIO';
  sourceType: 'M68';
  externalEventId: string;
  externalDeviceType: 'M68';
  externalDeviceId: string;
  externalKind: string;
  eventType: 'UNREGISTERED_SIGHTING' | 'CREDENTIAL_SCAN' | 'CREDENTIAL_ENROLLMENT' | 'DEVICE_OPERATION' | 'UNKNOWN';
  deviceBindingId?: string;
  jenixDeviceId?: string;
  gateId?: string;
  exceptionStatus: 'MATCHED' | 'UNMATCHED_DEVICE' | 'UNKNOWN_EVENT' | 'RESOLVED' | 'IGNORED';
  exceptionReason?: string;
  resolvedAt?: Date;
  resolvedByUserId?: string;
  resolutionNotes?: string;
  occurredAt: Date;
  lastSyncedAt: Date;
  rawData?: Record<string, unknown>;
}

const SamaAccessEventSchema = new Schema(
  {
    societyId: { type: Schema.Types.ObjectId, ref: 'Society', required: true },
    sourceProvider: { type: String, enum: ['EDGEFOLIO'], default: 'EDGEFOLIO' },
    sourceType: { type: String, enum: ['M68'], default: 'M68' },
    externalEventId: { type: String, required: true, trim: true },
    externalDeviceType: { type: String, enum: ['M68'], default: 'M68' },
    externalDeviceId: { type: String, required: true, trim: true },
    externalKind: { type: String, required: true, trim: true },
    eventType: { type: String, enum: ['UNREGISTERED_SIGHTING', 'CREDENTIAL_SCAN', 'CREDENTIAL_ENROLLMENT', 'DEVICE_OPERATION', 'UNKNOWN'], required: true },
    deviceBindingId: { type: Schema.Types.ObjectId, ref: 'SamaDeviceBinding' },
    jenixDeviceId: { type: Schema.Types.ObjectId, ref: 'Device' },
    gateId: { type: Schema.Types.ObjectId, ref: 'Gate' },
    exceptionStatus: { type: String, enum: ['MATCHED', 'UNMATCHED_DEVICE', 'UNKNOWN_EVENT', 'RESOLVED', 'IGNORED'], default: 'MATCHED' },
    exceptionReason: { type: String, trim: true },
    resolvedAt: { type: Date },
    resolvedByUserId: { type: Schema.Types.ObjectId, ref: 'User' },
    resolutionNotes: { type: String, trim: true },
    occurredAt: { type: Date, required: true },
    lastSyncedAt: { type: Date, required: true },
    rawData: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

SamaAccessEventSchema.index({ societyId: 1, sourceProvider: 1, externalEventId: 1 }, { unique: true });
SamaAccessEventSchema.index({ societyId: 1, occurredAt: -1 });
SamaAccessEventSchema.index({ societyId: 1, exceptionStatus: 1, occurredAt: -1 });

export const SamaAccessEvent: Model<ISamaAccessEventDocument> =
  mongoose.model<ISamaAccessEventDocument>('SamaAccessEvent', SamaAccessEventSchema);
