import mongoose, { Document, Model, Schema } from 'mongoose';

export interface ISamaDeviceBindingDocument extends Document {
  societyId: string;
  sourceProvider: 'EDGEFOLIO';
  externalDeviceType: 'M68' | 'U5';
  externalDeviceId: string;
  externalDeviceName?: string;
  jenixDeviceId: string;
  gateId?: string;
  isActive: boolean;
  createdBy: string;
  updatedBy: string;
}

const SamaDeviceBindingSchema = new Schema(
  {
    societyId: { type: Schema.Types.ObjectId, ref: 'Society', required: true },
    sourceProvider: { type: String, enum: ['EDGEFOLIO'], default: 'EDGEFOLIO' },
    externalDeviceType: { type: String, enum: ['M68', 'U5'], required: true },
    externalDeviceId: { type: String, required: true, trim: true },
    externalDeviceName: { type: String, trim: true },
    jenixDeviceId: { type: Schema.Types.ObjectId, ref: 'Device', required: true },
    gateId: { type: Schema.Types.ObjectId, ref: 'Gate' },
    isActive: { type: Boolean, default: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

SamaDeviceBindingSchema.index({ societyId: 1, sourceProvider: 1, externalDeviceType: 1, externalDeviceId: 1 }, { unique: true });
SamaDeviceBindingSchema.index({ societyId: 1, jenixDeviceId: 1 });

export const SamaDeviceBinding: Model<ISamaDeviceBindingDocument> =
  mongoose.model<ISamaDeviceBindingDocument>('SamaDeviceBinding', SamaDeviceBindingSchema);
