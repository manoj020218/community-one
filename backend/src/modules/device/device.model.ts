import mongoose, { Schema, Document, Model } from 'mongoose';

export type DeviceType = 'BOOM_BARRIER_CONTROLLER'|'UHF_READER'|'QR_SCANNER'|'RFID_READER'|'ACCESS_READER'|'RELAY_CONTROLLER'|'GATE_CAMERA'|'GUARD_DEVICE'|'PANIC_BUTTON'|'IOT_GATEWAY'|'OTHER';

export interface IDeviceDocument extends Document {
  societyId: string;
  deviceName: string;
  deviceType: DeviceType;
  deviceCode: string;
  gateName?: string;
  location?: string;
  ipAddress?: string;
  macAddress?: string;
  apiKey: string;
  firmwareVersion?: string;
  lastHeartbeatAt?: Date;
  onlineStatus: boolean;
  mappedModuleCode?: string;
  status: 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE';
  createdBy: string;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

const DeviceSchema = new Schema(
  {
    societyId: { type: Schema.Types.ObjectId, ref: 'Society', required: true },
    deviceName: { type: String, required: true, trim: true },
    deviceType: { type: String, enum: ['BOOM_BARRIER_CONTROLLER','UHF_READER','QR_SCANNER','RFID_READER','ACCESS_READER','RELAY_CONTROLLER','GATE_CAMERA','GUARD_DEVICE','PANIC_BUTTON','IOT_GATEWAY','OTHER'], required: true },
    deviceCode: { type: String, required: true, trim: true },
    gateName: { type: String },
    location: { type: String },
    ipAddress: { type: String },
    macAddress: { type: String },
    apiKey: { type: String, required: true },
    firmwareVersion: { type: String },
    lastHeartbeatAt: { type: Date },
    onlineStatus: { type: Boolean, default: false },
    mappedModuleCode: { type: String },
    status: { type: String, enum: ['ACTIVE','INACTIVE','MAINTENANCE'], default: 'ACTIVE' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

DeviceSchema.index({ societyId: 1, deviceCode: 1 }, { unique: true });

export const Device: Model<IDeviceDocument> = mongoose.model<IDeviceDocument>('Device', DeviceSchema);
