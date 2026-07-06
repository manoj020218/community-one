import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IReceiptDocument extends Document {
  societyId: string;
  paymentRecordId: string;
  receiptNo: string;
  flatId: string;
  memberId?: string;
  amount: number;
  purpose: string;
  paymentMode: string;
  receiptDate: Date;
  generatedBy: string;
  pdfUrl?: string;
  verificationCode: string;
  status: 'ACTIVE' | 'CANCELLED' | 'VOID';
  createdAt?: Date;
  updatedAt?: Date;
}

const ReceiptSchema = new Schema(
  {
    societyId: { type: Schema.Types.ObjectId, ref: 'Society', required: true },
    paymentRecordId: { type: Schema.Types.ObjectId, ref: 'PaymentRecord', required: true },
    receiptNo: { type: String, required: true },
    flatId: { type: Schema.Types.ObjectId, ref: 'Flat', required: true },
    memberId: { type: Schema.Types.ObjectId, ref: 'Resident' },
    amount: { type: Number, required: true },
    purpose: { type: String, required: true },
    paymentMode: { type: String, required: true },
    receiptDate: { type: Date, default: Date.now },
    generatedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    pdfUrl: { type: String },
    verificationCode: { type: String, required: true },
    status: { type: String, enum: ['ACTIVE','CANCELLED','VOID'], default: 'ACTIVE' },
  },
  { timestamps: true }
);

ReceiptSchema.index({ societyId: 1, receiptNo: 1 }, { unique: true });
ReceiptSchema.index({ paymentRecordId: 1 });

export const Receipt: Model<IReceiptDocument> = mongoose.model<IReceiptDocument>('Receipt', ReceiptSchema);

// Counter for receipt numbers per society per year
const ReceiptCounterSchema = new Schema({ societyId: String, year: Number, count: { type: Number, default: 0 } });
ReceiptCounterSchema.index({ societyId: 1, year: 1 }, { unique: true });
export const ReceiptCounter = mongoose.model('ReceiptCounter', ReceiptCounterSchema);
