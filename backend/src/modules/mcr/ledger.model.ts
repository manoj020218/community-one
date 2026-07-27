import mongoose, { Document, Model, Schema } from 'mongoose';

export interface ILedgerEntryDocument extends Document {
  societyId: string;
  flatId: string;
  residentId?: string;
  entryNumber: string;
  entryDate: Date;
  entryType: string;
  sourceType: string;
  sourceId: string;
  debitPaise: number;
  creditPaise: number;
  runningBalancePaise: number;
  description: string;
  createdBy: string;
  reversalOfEntryId?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const LedgerEntrySchema = new Schema(
  {
    societyId: { type: Schema.Types.ObjectId, ref: 'Society', required: true },
    flatId: { type: Schema.Types.ObjectId, ref: 'Flat', required: true },
    residentId: { type: Schema.Types.ObjectId, ref: 'Resident' },
    entryNumber: { type: String, required: true },
    entryDate: { type: Date, required: true },
    entryType: { type: String, required: true },
    sourceType: { type: String, required: true },
    sourceId: { type: String, required: true, trim: true },
    debitPaise: { type: Number, default: 0, min: 0 },
    creditPaise: { type: Number, default: 0, min: 0 },
    runningBalancePaise: { type: Number, required: true },
    description: { type: String, required: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    reversalOfEntryId: { type: Schema.Types.ObjectId, ref: 'LedgerEntry' },
  },
  { timestamps: true }
);

LedgerEntrySchema.index({ societyId: 1, entryNumber: 1 }, { unique: true });
LedgerEntrySchema.index({ societyId: 1, sourceType: 1, sourceId: 1 });
LedgerEntrySchema.index({ societyId: 1, flatId: 1, createdAt: -1 });

export const LedgerEntry: Model<ILedgerEntryDocument> = mongoose.model<ILedgerEntryDocument>(
  'LedgerEntry',
  LedgerEntrySchema
);
