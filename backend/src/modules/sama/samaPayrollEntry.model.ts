import mongoose, { Document, Model, Schema } from 'mongoose';

export interface ISamaPayrollEntryDocument extends Document {
  societyId: string;
  sourceProvider: 'EDGEFOLIO';
  externalPayslipId: string;
  externalRunId: string;
  externalStaffId: string;
  empCode?: string;
  employeeName: string;
  employeeEmail?: string;
  employeePhone?: string;
  monthKey: string;
  basicSalaryPaise?: number;
  earnings?: Record<string, number>;
  deductions?: Record<string, number>;
  grossPaise?: number;
  netSalaryPaise?: number;
  bankAccountMasked?: string;
  status?: string;
  dispute?: Record<string, unknown> | null;
  externalUpdatedAt?: Date;
  lastSyncedAt: Date;
  rawData?: Record<string, unknown>;
}

const SamaPayrollEntrySchema = new Schema(
  {
    societyId: { type: Schema.Types.ObjectId, ref: 'Society', required: true },
    sourceProvider: { type: String, enum: ['EDGEFOLIO'], required: true },
    externalPayslipId: { type: String, required: true, trim: true },
    externalRunId: { type: String, required: true, trim: true },
    externalStaffId: { type: String, required: true, trim: true },
    empCode: { type: String, trim: true },
    employeeName: { type: String, required: true, trim: true },
    employeeEmail: { type: String, trim: true, lowercase: true },
    employeePhone: { type: String, trim: true },
    monthKey: { type: String, required: true, trim: true },
    basicSalaryPaise: { type: Number },
    earnings: { type: Schema.Types.Mixed },
    deductions: { type: Schema.Types.Mixed },
    grossPaise: { type: Number },
    netSalaryPaise: { type: Number },
    bankAccountMasked: { type: String, trim: true },
    status: { type: String, trim: true },
    dispute: { type: Schema.Types.Mixed },
    externalUpdatedAt: { type: Date },
    lastSyncedAt: { type: Date, required: true },
    rawData: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

SamaPayrollEntrySchema.index(
  { societyId: 1, sourceProvider: 1, externalPayslipId: 1 },
  { unique: true }
);

export const SamaPayrollEntry: Model<ISamaPayrollEntryDocument> = mongoose.model<ISamaPayrollEntryDocument>(
  'SamaPayrollEntry',
  SamaPayrollEntrySchema
);
