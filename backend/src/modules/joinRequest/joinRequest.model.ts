import mongoose, { Schema, Document, Model } from 'mongoose';

export type JoinRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface IJoinRequestDocument extends Document {
  societyId: string;
  name: string;
  mobile: string;
  email?: string;
  claimedFlatNo?: string;
  // Set at submit time when an existing Resident in this society already has this mobile
  // and no login yet — lets the admin review screen offer a one-click "Approve & Grant
  // Login" instead of asking them to pick a flat for someone already on file.
  matchedResidentId?: string;
  status: JoinRequestStatus;
  reviewedBy?: string;
  reviewedAt?: Date;
  rejectionReason?: string;
  resultingResidentId?: string;
  resultingUserId?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const JoinRequestSchema = new Schema(
  {
    societyId: { type: Schema.Types.ObjectId, ref: 'Society', required: true },
    name: { type: String, required: true, trim: true },
    mobile: { type: String, required: true, trim: true },
    email: { type: String, trim: true, lowercase: true },
    claimedFlatNo: { type: String, trim: true },
    matchedResidentId: { type: Schema.Types.ObjectId, ref: 'Resident' },
    status: { type: String, enum: ['PENDING', 'APPROVED', 'REJECTED'], default: 'PENDING' },
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: { type: Date },
    rejectionReason: { type: String },
    resultingResidentId: { type: Schema.Types.ObjectId, ref: 'Resident' },
    resultingUserId: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

JoinRequestSchema.index({ societyId: 1, status: 1, createdAt: -1 });
JoinRequestSchema.index({ mobile: 1, societyId: 1 });

export const JoinRequest: Model<IJoinRequestDocument> = mongoose.model<IJoinRequestDocument>(
  'JoinRequest',
  JoinRequestSchema
);
