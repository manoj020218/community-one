import mongoose, { Document, Model, Schema } from 'mongoose';

// Built-in suggestions only — not a validation enum. A society can add its own categories
// (see mcrExpenseCategory.model.ts) to match its own norms, so `category` on the Expense
// document itself is a free string, not restricted to this list.
export const EXPENSE_CATEGORIES = [
  'SALARY', 'ELECTRICITY', 'WATER', 'REPAIRS', 'SECURITY',
  'HOUSEKEEPING', 'INSURANCE', 'ADMIN', 'OTHER',
] as const;
export type ExpenseCategory = string;

export const EXPENSE_PAYMENT_MODES = ['CASH', 'BANK'] as const;
export type ExpensePaymentMode = typeof EXPENSE_PAYMENT_MODES[number];

export const EXPENSE_STATUSES = ['RECORDED', 'CANCELLED'] as const;

export interface IExpenseDocument extends Document {
  societyId: string;
  expenseNumber: string;
  category: ExpenseCategory;
  amountPaise: number;
  paymentMode: ExpensePaymentMode;
  paidTo: string;
  expenseDate: Date;
  description?: string;
  proofFileIds: string[];
  status: 'RECORDED' | 'CANCELLED';
  cancellationReason?: string;
  cancelledBy?: string;
  cancelledAt?: Date;
  createdBy: string;
  updatedBy: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const ExpenseSchema = new Schema(
  {
    societyId: { type: Schema.Types.ObjectId, ref: 'Society', required: true },
    expenseNumber: { type: String, required: true, trim: true },
    category: { type: String, required: true, trim: true },
    amountPaise: { type: Number, required: true, min: 1 },
    paymentMode: { type: String, enum: EXPENSE_PAYMENT_MODES, required: true },
    paidTo: { type: String, required: true, trim: true },
    expenseDate: { type: Date, required: true },
    description: { type: String, trim: true },
    proofFileIds: [{ type: Schema.Types.ObjectId, ref: 'FileAsset' }],
    status: { type: String, enum: EXPENSE_STATUSES, default: 'RECORDED' },
    cancellationReason: { type: String, trim: true },
    cancelledBy: { type: Schema.Types.ObjectId, ref: 'User' },
    cancelledAt: { type: Date },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

ExpenseSchema.index({ societyId: 1, expenseNumber: 1 }, { unique: true });
ExpenseSchema.index({ societyId: 1, status: 1, expenseDate: -1 });
ExpenseSchema.index({ societyId: 1, category: 1 });

export const Expense: Model<IExpenseDocument> = mongoose.model<IExpenseDocument>('Expense', ExpenseSchema);
