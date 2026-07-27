import mongoose, { Document, Model, Schema } from 'mongoose';

export interface IMcrGatewayWebhookEventDocument extends Document {
  provider: string;
  eventId: string;
  gatewayOrderId: string;
  gatewayPaymentId?: string;
  paymentId?: string;
  societyId?: string;
  signatureStatus: string;
  eventType: string;
  payload: Record<string, unknown>;
  processedAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

const McrGatewayWebhookEventSchema = new Schema(
  {
    provider: { type: String, required: true, trim: true },
    eventId: { type: String, required: true, trim: true },
    gatewayOrderId: { type: String, required: true, trim: true },
    gatewayPaymentId: { type: String, trim: true },
    paymentId: { type: Schema.Types.ObjectId, ref: 'McrPaymentRecord' },
    societyId: { type: Schema.Types.ObjectId, ref: 'Society' },
    signatureStatus: { type: String, required: true, trim: true },
    eventType: { type: String, required: true, trim: true },
    payload: { type: Schema.Types.Mixed, required: true },
    processedAt: { type: Date },
  },
  { timestamps: true }
);

McrGatewayWebhookEventSchema.index({ provider: 1, eventId: 1 }, { unique: true });
McrGatewayWebhookEventSchema.index({ gatewayOrderId: 1, createdAt: -1 });

export const McrGatewayWebhookEvent: Model<IMcrGatewayWebhookEventDocument> = mongoose.model<IMcrGatewayWebhookEventDocument>(
  'McrGatewayWebhookEvent',
  McrGatewayWebhookEventSchema
);
