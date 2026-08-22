import mongoose, { Document, Model, Schema } from 'mongoose';
import { MCR_PAYMENT_METHODS, MCR_PAYMENT_STATUSES } from './mcrDomain.types';

export interface IMcrPaymentRecordDocument extends Document {
  societyId: string;
  paymentNumber: string;
  flatId: string;
  residentId?: string;
  payerName: string;
  payerMobile?: string;
  amountPaise: number;
  paymentMethod: string;
  paymentDate: Date;
  receivedDate: Date;
  proofFileIds?: string[];
  status: string;
  idempotencyKey?: string;
  allocatedAmountPaise: number;
  advanceCreatedPaise: number;
  enteredBy: string;
  verifiedBy?: string;
  verifiedAt?: Date;
  rejectedBy?: string;
  rejectedAt?: Date;
  rejectionReason?: string;
  cancelledBy?: string;
  cancelledAt?: Date;
  cancellationReason?: string;
  bouncedBy?: string;
  bouncedAt?: Date;
  bounceReason?: string;
  receiptId?: string;
  reversedLedgerEntryId?: string;
  gatewayProvider?: string;
  gatewayOrderId?: string;
  gatewayPaymentId?: string;
  gatewaySignatureStatus?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const McrPaymentRecordSchema = new Schema(
  {
    societyId: { type: Schema.Types.ObjectId, ref: 'Society', required: true },
    paymentNumber: { type: String, required: true, trim: true },
    flatId: { type: Schema.Types.ObjectId, ref: 'Flat', required: true },
    residentId: { type: Schema.Types.ObjectId, ref: 'Resident' },
    payerName: { type: String, required: true, trim: true },
    payerMobile: { type: String, trim: true },
    amountPaise: { type: Number, required: true, min: 0 },
    paymentMethod: { type: String, enum: MCR_PAYMENT_METHODS, required: true },
    paymentDate: { type: Date, required: true },
    receivedDate: { type: Date, required: true },
    bankReference: { type: String, trim: true },
    upiReference: { type: String, trim: true },
    chequeNumber: { type: String, trim: true },
    chequeDate: { type: Date },
    bankName: { type: String, trim: true },
    cardReference: { type: String, trim: true },
    cashCollectionReference: { type: String, trim: true },
    notes: { type: String, trim: true },
    proofFileIds: [{ type: Schema.Types.ObjectId, ref: 'FileAsset' }],
    status: { type: String, enum: MCR_PAYMENT_STATUSES, default: 'DRAFT' },
    source: { type: String, default: 'MANUAL' },
    idempotencyKey: { type: String, trim: true },
    allocatedAmountPaise: { type: Number, default: 0, min: 0 },
    advanceCreatedPaise: { type: Number, default: 0, min: 0 },
    enteredBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    verifiedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    verifiedAt: { type: Date },
    receiptId: { type: Schema.Types.ObjectId, ref: 'McrReceipt' },
    rejectedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    rejectedAt: { type: Date },
    rejectionReason: { type: String, trim: true },
    cancelledBy: { type: Schema.Types.ObjectId, ref: 'User' },
    cancelledAt: { type: Date },
    cancellationReason: { type: String, trim: true },
    bouncedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    bouncedAt: { type: Date },
    bounceReason: { type: String, trim: true },
    reversedLedgerEntryId: { type: Schema.Types.ObjectId, ref: 'LedgerEntry' },
    gatewayProvider: { type: String, trim: true },
    gatewayOrderId: { type: String, trim: true },
    gatewayPaymentId: { type: String, trim: true },
    gatewaySignatureStatus: { type: String, trim: true },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

McrPaymentRecordSchema.index({ societyId: 1, paymentNumber: 1 }, { unique: true });
// `sparse` only excludes a document when ALL of a compound index's fields are missing — since
// societyId is always present here, sparse gave no protection at all: every payment missing
// idempotencyKey (i.e. every manually-recorded one, since only WhatsApp-inbound payments set
// it) got indexed as { societyId, idempotencyKey: null }, so only the FIRST such payment per
// society could ever be inserted and every later one failed as a false "duplicate". A
// partialFilterExpression is the correct way to say "unique only when the field is actually
// set" for a compound index like this.
McrPaymentRecordSchema.index(
  { societyId: 1, idempotencyKey: 1 },
  { unique: true, partialFilterExpression: { idempotencyKey: { $exists: true } } }
);
McrPaymentRecordSchema.index({ societyId: 1, flatId: 1, status: 1, paymentDate: -1 });

export const McrPaymentRecord: Model<IMcrPaymentRecordDocument> = mongoose.model<IMcrPaymentRecordDocument>(
  'McrPaymentRecord',
  McrPaymentRecordSchema
);
