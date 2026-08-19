import mongoose, { Document, Model, Schema } from 'mongoose';

export type BannerType = 'UPDATE' | 'ANNOUNCEMENT' | 'OTHER';

/**
 * Platform-wide (not per-society) — app-update notices and general announcements are the
 * same audience regardless of which society/hostel a user belongs to. Deliberately no script/
 * HTML field: text + image + a single link, rendered by a fixed component, never raw markup —
 * this is a backend-controlled surface shown to every logged-in user, so it must not become an
 * XSS vector if the admin account or backend were ever compromised.
 */
export interface IBannerDocument extends Document {
  title?: string;
  message: string;
  imageUrl?: string;
  linkUrl?: string;
  linkLabel?: string;
  bannerType: BannerType;
  isActive: boolean;
  createdBy: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const BannerSchema = new Schema(
  {
    title: { type: String, trim: true },
    message: { type: String, required: true, trim: true },
    imageUrl: { type: String, trim: true },
    linkUrl: { type: String, trim: true },
    linkLabel: { type: String, trim: true },
    bannerType: { type: String, enum: ['UPDATE', 'ANNOUNCEMENT', 'OTHER'], default: 'ANNOUNCEMENT' },
    isActive: { type: Boolean, default: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

BannerSchema.index({ isActive: 1, createdAt: -1 });

export const Banner: Model<IBannerDocument> = mongoose.model<IBannerDocument>('Banner', BannerSchema);
