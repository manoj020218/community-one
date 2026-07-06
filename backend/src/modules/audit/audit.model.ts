import mongoose, { Schema, Document, Model } from 'mongoose';
import { IAuditLog } from './audit.types';

export interface IAuditLogDocument extends IAuditLog, Document {}

const AuditLogSchema = new Schema(
  {
    societyId: { type: Schema.Types.ObjectId, ref: 'Society' },
    actorUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    actorRole: { type: String, required: true },
    moduleCode: { type: String, required: true },
    action: { type: String, required: true },
    entityType: { type: String, required: true },
    entityId: { type: String },
    oldValue: { type: Schema.Types.Mixed },
    newValue: { type: Schema.Types.Mixed },
    reason: { type: String },
    ipAddress: { type: String },
    userAgent: { type: String },
  },
  { timestamps: true, updatedAt: false }
);

AuditLogSchema.index({ societyId: 1, createdAt: -1 });
AuditLogSchema.index({ actorUserId: 1 });
AuditLogSchema.index({ moduleCode: 1 });
AuditLogSchema.index({ action: 1 });

export const AuditLog: Model<IAuditLogDocument> = mongoose.model<IAuditLogDocument>(
  'AuditLog',
  AuditLogSchema
);
