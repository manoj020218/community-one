import mongoose, { Document, Model, Schema } from 'mongoose';

export type WhatsAppLinkStatus = 'DISCONNECTED' | 'CONNECTING' | 'CONNECTED';

export interface ICommunicationSettingsDocument extends Document {
  societyId: string;
  smtp: {
    host?: string;
    port?: number;
    secure: boolean;
    username?: string;
    password?: string;
    fromEmail?: string;
    fromName?: string;
    enabled: boolean;
  };
  whatsapp: {
    phoneNumber?: string;
    status: WhatsAppLinkStatus;
    linkedAt?: Date;
    lastConnectedAt?: Date;
  };
  smsGateway: {
    enabled: boolean;
  };
  createdAt?: Date;
  updatedAt?: Date;
}

const CommunicationSettingsSchema = new Schema(
  {
    societyId: { type: Schema.Types.ObjectId, ref: 'Society', required: true, unique: true },
    smtp: {
      host: { type: String, trim: true },
      port: { type: Number },
      secure: { type: Boolean, default: false },
      username: { type: String, trim: true },
      password: { type: String },
      fromEmail: { type: String, trim: true, lowercase: true },
      fromName: { type: String, trim: true },
      enabled: { type: Boolean, default: false },
    },
    whatsapp: {
      phoneNumber: { type: String, trim: true },
      status: { type: String, enum: ['DISCONNECTED', 'CONNECTING', 'CONNECTED'], default: 'DISCONNECTED' },
      linkedAt: { type: Date },
      lastConnectedAt: { type: Date },
    },
    smsGateway: {
      enabled: { type: Boolean, default: false },
    },
  },
  { timestamps: true }
);

export const CommunicationSettings: Model<ICommunicationSettingsDocument> = mongoose.model<ICommunicationSettingsDocument>(
  'CommunicationSettings',
  CommunicationSettingsSchema
);
