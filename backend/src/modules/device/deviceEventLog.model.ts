import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IDeviceEventLogDocument extends Document {
  deviceId: string;
  societyId: string;
  make: string;
  rawBody: unknown;
  parsedEvents: Array<{
    deviceExternalUserId: string;
    personName?: string;
    timestamp: Date;
    method: string;
    passed: boolean;
  }>;
  warning?: string;
  receivedAt: Date;
}

const DeviceEventLogSchema = new Schema(
  {
    deviceId: { type: Schema.Types.ObjectId, ref: 'Device', required: true },
    societyId: { type: Schema.Types.ObjectId, ref: 'Society', required: true },
    make: { type: String, required: true },
    rawBody: { type: Schema.Types.Mixed },
    parsedEvents: [
      {
        _id: false,
        deviceExternalUserId: String,
        personName: String,
        timestamp: Date,
        method: String,
        passed: Boolean,
      },
    ],
    warning: { type: String },
    receivedAt: { type: Date, default: Date.now },
  },
  { timestamps: false }
);

DeviceEventLogSchema.index({ deviceId: 1, receivedAt: -1 });

export const DeviceEventLog: Model<IDeviceEventLogDocument> = mongoose.model<IDeviceEventLogDocument>(
  'DeviceEventLog',
  DeviceEventLogSchema
);
