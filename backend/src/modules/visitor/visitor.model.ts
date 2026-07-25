import mongoose, { Document, Model, Schema } from 'mongoose';
import { VisitorRequestStatus } from './visitor.constants';

export interface IVisitorRequestDocument extends Document {
  societyId: string;
  gateId: string;
  towerId: string;
  flatId: string;
  requestedHostUserIds: string[];
  createdByUserId: string;
  visitorName: string;
  visitorMobile?: string;
  visitorMobileNormalized?: string;
  visitorPhotoFileId?: string;
  purpose?: string;
  vehicleNumber?: string;
  status: VisitorRequestStatus;
  statusChangedAt: Date;
  clientRequestId?: string;
  decisionByUserId?: string;
  decisionAt?: Date;
  rejectionReason?: string;
  approvalNote?: string;
  entryConfirmedByUserId?: string;
  entryAt?: Date;
  exitConfirmedByUserId?: string;
  exitAt?: Date;
  expiresAt?: Date;
  closedAt?: Date;
  requestSource: 'GUARD';
  version: number;
  createdAt?: Date;
  updatedAt?: Date;
}

const VisitorRequestSchema = new Schema(
  {
    societyId: { type: Schema.Types.ObjectId, ref: 'Society', required: true },
    gateId: { type: Schema.Types.ObjectId, ref: 'Gate', required: true },
    towerId: { type: Schema.Types.ObjectId, ref: 'Tower', required: true },
    flatId: { type: Schema.Types.ObjectId, ref: 'Flat', required: true },
    requestedHostUserIds: [{ type: Schema.Types.ObjectId, ref: 'User', required: true }],
    createdByUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    visitorName: { type: String, required: true, trim: true },
    visitorMobile: { type: String, trim: true },
    visitorMobileNormalized: { type: String, trim: true },
    visitorPhotoFileId: { type: Schema.Types.ObjectId, ref: 'FileAsset' },
    purpose: { type: String, trim: true },
    vehicleNumber: { type: String, trim: true },
    status: { type: String, required: true },
    statusChangedAt: { type: Date, required: true, default: Date.now },
    clientRequestId: { type: String, trim: true },
    decisionByUserId: { type: Schema.Types.ObjectId, ref: 'User' },
    decisionAt: { type: Date },
    rejectionReason: { type: String, trim: true },
    approvalNote: { type: String, trim: true },
    entryConfirmedByUserId: { type: Schema.Types.ObjectId, ref: 'User' },
    entryAt: { type: Date },
    exitConfirmedByUserId: { type: Schema.Types.ObjectId, ref: 'User' },
    exitAt: { type: Date },
    expiresAt: { type: Date },
    closedAt: { type: Date },
    requestSource: { type: String, enum: ['GUARD'], default: 'GUARD' },
    version: { type: Number, default: 1 },
  },
  { timestamps: true }
);

VisitorRequestSchema.index({ societyId: 1, createdAt: -1 });
VisitorRequestSchema.index({ societyId: 1, gateId: 1, status: 1 });
VisitorRequestSchema.index({ societyId: 1, flatId: 1, createdAt: -1 });
VisitorRequestSchema.index({ societyId: 1, expiresAt: 1, status: 1 });
VisitorRequestSchema.index({ societyId: 1, visitorMobileNormalized: 1 });
VisitorRequestSchema.index({ societyId: 1, status: 1, updatedAt: -1 });
VisitorRequestSchema.index(
  { societyId: 1, createdByUserId: 1, clientRequestId: 1 },
  { unique: true, partialFilterExpression: { clientRequestId: { $exists: true, $type: 'string' } } }
);

export const VisitorRequest: Model<IVisitorRequestDocument> = mongoose.model<IVisitorRequestDocument>(
  'VisitorRequest',
  VisitorRequestSchema
);
