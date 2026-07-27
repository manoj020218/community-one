import mongoose, { Document, Model, Schema } from 'mongoose';

export interface IServiceProviderProfileDocument extends Document {
  societyId: string;
  providerCode: string;
  displayName: string;
  providerType: 'INDIVIDUAL' | 'COMPANY';
  contactPersonName?: string;
  mobile: string;
  email?: string;
  serviceCategories: string[];
  linkedStaffProfileId?: string;
  notes?: string;
  sourceType: 'JENIX_NATIVE' | 'EDGE_IMPORTED';
  status: 'ACTIVE' | 'SUSPENDED' | 'INACTIVE';
  verificationStatus: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdBy: string;
  updatedBy: string;
}

const ServiceProviderProfileSchema = new Schema(
  {
    societyId: { type: Schema.Types.ObjectId, ref: 'Society', required: true },
    providerCode: { type: String, required: true, trim: true },
    displayName: { type: String, required: true, trim: true },
    providerType: { type: String, enum: ['INDIVIDUAL', 'COMPANY'], required: true },
    contactPersonName: { type: String, trim: true },
    mobile: { type: String, required: true, trim: true },
    email: { type: String, trim: true, lowercase: true },
    serviceCategories: { type: [String], default: [] },
    linkedStaffProfileId: { type: Schema.Types.ObjectId, ref: 'StaffProfile' },
    notes: { type: String, trim: true },
    sourceType: { type: String, enum: ['JENIX_NATIVE', 'EDGE_IMPORTED'], default: 'JENIX_NATIVE' },
    status: { type: String, enum: ['ACTIVE', 'SUSPENDED', 'INACTIVE'], default: 'ACTIVE' },
    verificationStatus: { type: String, enum: ['PENDING', 'APPROVED', 'REJECTED'], default: 'PENDING' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

ServiceProviderProfileSchema.index({ societyId: 1, providerCode: 1 }, { unique: true });
ServiceProviderProfileSchema.index({ societyId: 1, status: 1, providerType: 1 });

export const ServiceProviderProfile: Model<IServiceProviderProfileDocument> =
  mongoose.model<IServiceProviderProfileDocument>('ServiceProviderProfile', ServiceProviderProfileSchema);
