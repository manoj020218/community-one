import mongoose, { Document, Model, Schema } from 'mongoose';

export interface IHouseholdAssociationDocument extends Document {
  societyId: string;
  staffProfileId: string;
  engagementId: string;
  flatId: string;
  residentId: string;
  services: string[];
  monthlyRatePaise?: number;
  status: string;
  residentApprovedAt?: Date;
  residentApprovedByUserId?: string;
  societyApprovedAt?: Date;
  societyApprovedByUserId?: string;
  createdBy: string;
  updatedBy: string;
}

const HouseholdAssociationSchema = new Schema(
  {
    societyId: { type: Schema.Types.ObjectId, ref: 'Society', required: true },
    staffProfileId: { type: Schema.Types.ObjectId, ref: 'StaffProfile', required: true },
    engagementId: { type: Schema.Types.ObjectId, ref: 'StaffEngagement', required: true },
    flatId: { type: Schema.Types.ObjectId, ref: 'Flat', required: true },
    residentId: { type: Schema.Types.ObjectId, ref: 'Resident', required: true },
    services: [{ type: String, trim: true }],
    monthlyRatePaise: { type: Number, min: 0 },
    status: { type: String, enum: ['PENDING_RESIDENT_APPROVAL', 'PENDING_SOCIETY_APPROVAL', 'ACTIVE', 'SUSPENDED', 'ENDED'], default: 'PENDING_RESIDENT_APPROVAL' },
    residentApprovedAt: { type: Date },
    residentApprovedByUserId: { type: Schema.Types.ObjectId, ref: 'User' },
    societyApprovedAt: { type: Date },
    societyApprovedByUserId: { type: Schema.Types.ObjectId, ref: 'User' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

HouseholdAssociationSchema.index({ societyId: 1, staffProfileId: 1, flatId: 1, residentId: 1 }, { unique: true });
HouseholdAssociationSchema.index({ societyId: 1, flatId: 1, status: 1 });

export const HouseholdAssociation: Model<IHouseholdAssociationDocument> = mongoose.model<IHouseholdAssociationDocument>(
  'HouseholdAssociation',
  HouseholdAssociationSchema
);
