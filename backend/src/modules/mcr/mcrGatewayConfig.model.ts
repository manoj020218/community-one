import mongoose, { Document, Model, Schema } from 'mongoose';

export interface IMcrGatewayConfigDocument extends Document {
  societyId: string;
  provider: 'MOCK';
  enabled: boolean;
  publicKey?: string;
  secretKey?: string;
  webhookSecret?: string;
  autoVerifySuccessfulPayments: boolean;
  updatedBy: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const McrGatewayConfigSchema = new Schema(
  {
    societyId: { type: Schema.Types.ObjectId, ref: 'Society', required: true, unique: true },
    provider: { type: String, enum: ['MOCK'], default: 'MOCK' },
    enabled: { type: Boolean, default: false },
    publicKey: { type: String, trim: true },
    secretKey: { type: String, trim: true },
    webhookSecret: { type: String, trim: true },
    autoVerifySuccessfulPayments: { type: Boolean, default: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

export const McrGatewayConfig: Model<IMcrGatewayConfigDocument> = mongoose.model<IMcrGatewayConfigDocument>(
  'McrGatewayConfig',
  McrGatewayConfigSchema
);
