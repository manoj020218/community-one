import mongoose, { Schema, Document, Model } from 'mongoose';

export type NotificationType = 'INFO'|'WARNING'|'URGENT'|'APPROVAL'|'PAYMENT'|'DEVICE'|'SYSTEM';
export type NotificationPriority = 'LOW'|'MEDIUM'|'HIGH';
export type DeliveryStatus = 'PENDING'|'SENT'|'FAILED'|'READ';

export interface INotificationDocument extends Document {
  societyId?: string;
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
  moduleCode: string;
  actionUrl?: string;
  readAt?: Date;
  priority: NotificationPriority;
  deliveryStatus: DeliveryStatus;
  createdAt?: Date;
}

const NotificationSchema = new Schema(
  {
    societyId: { type: Schema.Types.ObjectId, ref: 'Society' },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    type: { type: String, enum: ['INFO','WARNING','URGENT','APPROVAL','PAYMENT','DEVICE','SYSTEM'], default: 'INFO' },
    moduleCode: { type: String, default: 'CORE' },
    actionUrl: { type: String },
    readAt: { type: Date },
    priority: { type: String, enum: ['LOW','MEDIUM','HIGH'], default: 'MEDIUM' },
    deliveryStatus: { type: String, enum: ['PENDING','SENT','FAILED','READ'], default: 'PENDING' },
  },
  { timestamps: true, updatedAt: false }
);

NotificationSchema.index({ userId: 1, createdAt: -1 });
NotificationSchema.index({ societyId: 1 });

export const Notification: Model<INotificationDocument> = mongoose.model<INotificationDocument>(
  'Notification',
  NotificationSchema
);
