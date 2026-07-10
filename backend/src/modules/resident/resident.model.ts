import mongoose, { Schema, Document, Model } from 'mongoose';

export type MemberType = 'OWNER' | 'TENANT' | 'FAMILY_MEMBER' | 'STAFF' | 'VENDOR';
export type KycStatus = 'PENDING' | 'SUBMITTED' | 'VERIFIED' | 'REJECTED';
export type ResidentStatus = 'ACTIVE' | 'INACTIVE' | 'MOVED_OUT';

export interface IResidentDocument extends Document {
  societyId: string;
  flatId: string;
  userId?: string;
  name: string;
  mobile: string;
  email?: string;
  photoUrl?: string;
  relation?: string;
  memberType: MemberType;
  loginAllowed: boolean;
  primaryContact: boolean;
  emergencyContact?: string;
  moveInDate?: Date;
  moveOutDate?: Date;
  kycStatus: KycStatus;
  kycVerifiedBy?: string;
  kycVerifiedAt?: Date;
  kycPhysicalLocation?: string;
  kycNotes?: string;
  status: ResidentStatus;
  createdBy: string;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

const ResidentSchema = new Schema(
  {
    societyId: { type: Schema.Types.ObjectId, ref: 'Society', required: true },
    flatId: { type: Schema.Types.ObjectId, ref: 'Flat', required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
    name: { type: String, required: true, trim: true },
    mobile: { type: String, required: true, trim: true },
    email: { type: String, trim: true, lowercase: true },
    photoUrl: { type: String },
    relation: { type: String },
    memberType: { type: String, enum: ['OWNER','TENANT','FAMILY_MEMBER','STAFF','VENDOR'], required: true },
    loginAllowed: { type: Boolean, default: false },
    primaryContact: { type: Boolean, default: false },
    emergencyContact: { type: String },
    moveInDate: { type: Date },
    moveOutDate: { type: Date },
    kycStatus: { type: String, enum: ['PENDING','SUBMITTED','VERIFIED','REJECTED'], default: 'PENDING' },
    kycVerifiedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    kycVerifiedAt: { type: Date },
    kycPhysicalLocation: { type: String },
    kycNotes: { type: String },
    status: { type: String, enum: ['ACTIVE','INACTIVE','MOVED_OUT'], default: 'ACTIVE' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

ResidentSchema.index({ societyId: 1, mobile: 1 });
ResidentSchema.index({ flatId: 1 });

export const Resident: Model<IResidentDocument> = mongoose.model<IResidentDocument>('Resident', ResidentSchema);
