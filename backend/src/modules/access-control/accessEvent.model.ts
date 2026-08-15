import mongoose, { Document, Model, Schema } from 'mongoose';
import { MatchStatus } from './access-control.types';

export interface IAccessEventDocument extends Document {
  societyId: string;
  zoneId: string;
  deviceId: string;
  residentId?: string;
  deviceExternalUserId: string;
  occurredAt: Date;
  passed: boolean;
  matchStatus: MatchStatus;
  deviceEventLogId: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const AccessEventSchema = new Schema(
  {
    societyId: { type: Schema.Types.ObjectId, ref: 'Society', required: true },
    zoneId: { type: Schema.Types.ObjectId, ref: 'Zone', required: true },
    deviceId: { type: Schema.Types.ObjectId, ref: 'Device', required: true },
    residentId: { type: Schema.Types.ObjectId, ref: 'Resident' },
    deviceExternalUserId: { type: String, required: true, trim: true },
    occurredAt: { type: Date, required: true },
    passed: { type: Boolean, default: true },
    matchStatus: { type: String, enum: ['MATCHED', 'UNRESOLVED_CREDENTIAL'], required: true },
    deviceEventLogId: { type: Schema.Types.ObjectId, ref: 'DeviceEventLog', required: true },
  },
  { timestamps: true }
);

AccessEventSchema.index({ deviceId: 1, deviceExternalUserId: 1, occurredAt: 1 }, { unique: true });
AccessEventSchema.index({ societyId: 1, zoneId: 1, occurredAt: -1 });
AccessEventSchema.index({ societyId: 1, matchStatus: 1 });

export const AccessEvent: Model<IAccessEventDocument> = mongoose.model<IAccessEventDocument>('AccessEvent', AccessEventSchema);
