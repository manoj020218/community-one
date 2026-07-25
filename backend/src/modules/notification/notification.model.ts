import mongoose, { Document, Model, Schema } from 'mongoose';

export type NotificationType = 'INFO' | 'WARNING' | 'URGENT' | 'APPROVAL' | 'PAYMENT' | 'DEVICE' | 'SYSTEM';
export type NotificationPriority = 'LOW' | 'MEDIUM' | 'HIGH';
export type DeliveryStatus =
  | 'PENDING'
  | 'SENT'
  | 'FAILED'
  | 'READ'
  | 'SKIPPED'
  | 'PENDING_PROVIDER_CONFIGURATION';

export interface INotificationDocument extends Document {
  societyId?: string;
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
  moduleCode: string;
  actionUrl?: string;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
  readAt?: Date;
  priority: NotificationPriority;
  deliveryStatus: DeliveryStatus;
  deliveryAttempts: number;
  lastDeliveryAttemptAt?: Date;
  lastDeliveryError?: string;
  providerMessageId?: string;
  createdAt?: Date;
}

const NotificationSchema = new Schema(
  {
    societyId: { type: Schema.Types.ObjectId, ref: 'Society' },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    type: { type: String, enum: ['INFO', 'WARNING', 'URGENT', 'APPROVAL', 'PAYMENT', 'DEVICE', 'SYSTEM'], default: 'INFO' },
    moduleCode: { type: String, default: 'CORE' },
    actionUrl: { type: String },
    entityType: { type: String },
    entityId: { type: String },
    metadata: { type: Schema.Types.Mixed },
    readAt: { type: Date },
    priority: { type: String, enum: ['LOW', 'MEDIUM', 'HIGH'], default: 'MEDIUM' },
    deliveryStatus: {
      type: String,
      enum: ['PENDING', 'SENT', 'FAILED', 'READ', 'SKIPPED', 'PENDING_PROVIDER_CONFIGURATION'],
      default: 'PENDING',
    },
    deliveryAttempts: { type: Number, default: 0 },
    lastDeliveryAttemptAt: { type: Date },
    lastDeliveryError: { type: String },
    providerMessageId: { type: String },
  },
  { timestamps: true, updatedAt: false }
);

NotificationSchema.index({ userId: 1, createdAt: -1 });
NotificationSchema.index({ societyId: 1 });
NotificationSchema.index({ entityType: 1, entityId: 1 });

export const Notification: Model<INotificationDocument> = mongoose.model<INotificationDocument>(
  'Notification',
  NotificationSchema
);
