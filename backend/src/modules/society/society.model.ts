import mongoose, { Schema, Document, Model } from 'mongoose';
import { ISociety } from './society.types';

export interface ISocietyDocument extends ISociety, Document {}

const SocietySchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    logoUrl: { type: String },
    address: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    pincode: { type: String, required: true },
    country: { type: String, default: 'India' },
    contactPersonName: { type: String, required: true },
    contactMobile: { type: String, required: true },
    contactEmail: { type: String, required: true, lowercase: true },
    planCode: {
      type: String,
      enum: ['BASIC', 'STANDARD', 'PREMIUM', 'ENTERPRISE'],
      default: 'BASIC',
    },
    enabledModules: [{ type: String }],
    status: {
      type: String,
      enum: ['ACTIVE', 'INACTIVE', 'SUSPENDED', 'ONBOARDING'],
      default: 'ONBOARDING',
    },
    billingStatus: {
      type: String,
      enum: ['ACTIVE', 'TRIAL', 'EXPIRED', 'SUSPENDED'],
      default: 'TRIAL',
    },
    onboardingComplete: { type: Boolean, default: false },
    // Self-onboarding fields
    selfOnboarded: { type: Boolean, default: false },
    agentCode: { type: String, trim: true },
    trialEndsAt: { type: Date },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

SocietySchema.index({ code: 1 }, { unique: true });
SocietySchema.index({ status: 1 });
SocietySchema.index({ city: 1, pincode: 1 });

export const Society: Model<ISocietyDocument> = mongoose.model<ISocietyDocument>(
  'Society',
  SocietySchema
);
