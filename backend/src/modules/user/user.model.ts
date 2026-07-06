import mongoose, { Schema, Document, Model } from 'mongoose';
import { IUser } from './user.types';

export interface IUserDocument extends IUser, Document {}

const UserSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    mobile: { type: String, required: true, trim: true },
    passwordHash: { type: String, required: true },
    roleCode: {
      type: String,
      required: true,
      enum: [
        'JENIX_SUPER_ADMIN', 'JENIX_SUPPORT', 'SOCIETY_ADMIN', 'COMMITTEE_MEMBER',
        'ACCOUNTANT', 'SECURITY_GUARD', 'FACILITY_MANAGER', 'OWNER',
        'TENANT', 'FAMILY_MEMBER', 'VENDOR', 'STAFF',
      ],
    },
    permissions: [{ type: String }],
    societyId: { type: Schema.Types.ObjectId, ref: 'Society' },
    flatId: { type: Schema.Types.ObjectId, ref: 'Flat' },
    photoUrl: { type: String },
    isActive: { type: Boolean, default: true },
    isEmailVerified: { type: Boolean, default: false },
    isMobileVerified: { type: Boolean, default: false },
    lastLoginAt: { type: Date },
    refreshToken: { type: String },
  },
  { timestamps: true }
);

UserSchema.index({ email: 1 }, { unique: true });
UserSchema.index({ mobile: 1 });
UserSchema.index({ societyId: 1 });

UserSchema.methods.toPublic = function () {
  const { passwordHash, refreshToken, ...rest } = this.toObject();
  return rest;
};

export const User: Model<IUserDocument> = mongoose.model<IUserDocument>('User', UserSchema);
