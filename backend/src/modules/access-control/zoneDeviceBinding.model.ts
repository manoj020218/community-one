import mongoose, { Document, Model, Schema } from 'mongoose';

export interface IZoneDeviceBindingDocument extends Document {
  societyId: string;
  zoneId: string;
  deviceId: string;
  lastSyncedReceivedAt?: Date;
  createdBy: string;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

const ZoneDeviceBindingSchema = new Schema(
  {
    societyId: { type: Schema.Types.ObjectId, ref: 'Society', required: true },
    zoneId: { type: Schema.Types.ObjectId, ref: 'Zone', required: true },
    deviceId: { type: Schema.Types.ObjectId, ref: 'Device', required: true },
    lastSyncedReceivedAt: { type: Date },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

ZoneDeviceBindingSchema.index({ zoneId: 1, deviceId: 1 }, { unique: true });
ZoneDeviceBindingSchema.index({ societyId: 1, isActive: 1 });

export const ZoneDeviceBinding: Model<IZoneDeviceBindingDocument> = mongoose.model<IZoneDeviceBindingDocument>(
  'ZoneDeviceBinding',
  ZoneDeviceBindingSchema
);
