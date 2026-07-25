import mongoose, { Document, Model, Schema } from 'mongoose';

export interface INotificationDeviceTokenDocument extends Document {
  userId: string;
  societyId?: string;
  token: string;
  platform?: 'ANDROID' | 'IOS' | 'WEB';
  provider: 'FCM';
  isActive: boolean;
  invalidatedAt?: Date;
  invalidationReason?: string;
  lastSeenAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

const NotificationDeviceTokenSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    societyId: { type: Schema.Types.ObjectId, ref: 'Society' },
    token: { type: String, required: true, unique: true },
    platform: { type: String, enum: ['ANDROID', 'IOS', 'WEB'] },
    provider: { type: String, enum: ['FCM'], default: 'FCM' },
    isActive: { type: Boolean, default: true },
    invalidatedAt: { type: Date },
    invalidationReason: { type: String },
    lastSeenAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

NotificationDeviceTokenSchema.index({ userId: 1, isActive: 1 });
NotificationDeviceTokenSchema.index({ societyId: 1, isActive: 1 });

export const NotificationDeviceToken: Model<INotificationDeviceTokenDocument> =
  mongoose.model<INotificationDeviceTokenDocument>('NotificationDeviceToken', NotificationDeviceTokenSchema);
