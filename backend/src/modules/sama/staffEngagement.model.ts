import mongoose, { Document, Model, Schema } from 'mongoose';

export interface IStaffEngagementDocument extends Document {
  societyId: string;
  staffProfileId: string;
  engagementType: string;
  employerType: string;
  employerFlatId?: string;
  employerResidentId?: string;
  jobTitle?: string;
  startDate: Date;
  endDate?: Date;
  status: string;
  paymentResponsibility: string;
  createdBy: string;
  updatedBy: string;
}

const StaffEngagementSchema = new Schema(
  {
    societyId: { type: Schema.Types.ObjectId, ref: 'Society', required: true },
    staffProfileId: { type: Schema.Types.ObjectId, ref: 'StaffProfile', required: true },
    engagementType: { type: String, enum: ['SOCIETY_PAYROLL', 'HOUSEHOLD_DIRECT', 'SERVICE_POOL', 'CONTRACTOR', 'TEMPORARY'], required: true },
    employerType: { type: String, enum: ['SOCIETY', 'HOUSEHOLD', 'CONTRACTOR'], required: true },
    employerFlatId: { type: Schema.Types.ObjectId, ref: 'Flat' },
    employerResidentId: { type: Schema.Types.ObjectId, ref: 'Resident' },
    jobTitle: { type: String, trim: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date },
    status: { type: String, enum: ['DRAFT', 'PENDING_APPROVAL', 'ACTIVE', 'SUSPENDED', 'EXPIRED', 'TERMINATED'], default: 'ACTIVE' },
    paymentResponsibility: { type: String, enum: ['SOCIETY', 'HOUSEHOLD', 'CONTRACTOR'], required: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

StaffEngagementSchema.index({ societyId: 1, staffProfileId: 1, engagementType: 1, startDate: -1 });

export const StaffEngagement: Model<IStaffEngagementDocument> = mongoose.model<IStaffEngagementDocument>(
  'StaffEngagement',
  StaffEngagementSchema
);
