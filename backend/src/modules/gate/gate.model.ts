import mongoose, { Document, Model, Schema } from 'mongoose';

export type GateEntryType = 'ENTRY' | 'EXIT' | 'BOTH' | 'SERVICE';

export interface IGateDocument extends Document {
  societyId: string;
  name: string;
  code: string;
  description?: string;
  towerIds: string[];
  entryType: GateEntryType;
  createdBy: string;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

const GateSchema = new Schema(
  {
    societyId: { type: Schema.Types.ObjectId, ref: 'Society', required: true },
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, trim: true, uppercase: true },
    description: { type: String, trim: true },
    towerIds: [{ type: Schema.Types.ObjectId, ref: 'Tower' }],
    entryType: {
      type: String,
      enum: ['ENTRY', 'EXIT', 'BOTH', 'SERVICE'],
      default: 'BOTH',
    },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

GateSchema.index({ societyId: 1, code: 1 }, { unique: true });
GateSchema.index({ societyId: 1, isActive: 1, name: 1 });

export const Gate: Model<IGateDocument> = mongoose.model<IGateDocument>('Gate', GateSchema);
