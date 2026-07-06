import mongoose, { Schema, Document, Model } from 'mongoose';
import { IRole } from './role.types';

export interface IRoleDocument extends IRole, Document {}

const RoleSchema = new Schema(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    permissions: [{ type: String }],
    isSystemRole: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

RoleSchema.index({ code: 1 }, { unique: true });

export const Role: Model<IRoleDocument> = mongoose.model<IRoleDocument>('Role', RoleSchema);
