import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IModuleRegistryDocument extends Document {
  code: string;
  name: string;
  description: string;
  version: string;
  status: 'ACTIVE' | 'INACTIVE' | 'COMING_SOON';
  icon: string;
  routePrefix: string;
  apiPrefix: string;
  requiredPlan: string[];
  defaultEnabled: boolean;
  permissions: string[];
  settingsSchema?: Record<string, any>;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

const ModuleRegistrySchema = new Schema(
  {
    code: { type: String, required: true, unique: true, uppercase: true },
    name: { type: String, required: true },
    description: { type: String, default: '' },
    version: { type: String, default: '1.0.0' },
    status: { type: String, enum: ['ACTIVE','INACTIVE','COMING_SOON'], default: 'COMING_SOON' },
    icon: { type: String, default: 'Package' },
    routePrefix: { type: String, required: true },
    apiPrefix: { type: String, required: true },
    requiredPlan: [{ type: String }],
    defaultEnabled: { type: Boolean, default: false },
    permissions: [{ type: String }],
    settingsSchema: { type: Schema.Types.Mixed },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const ModuleRegistry: Model<IModuleRegistryDocument> = mongoose.model<IModuleRegistryDocument>(
  'ModuleRegistry',
  ModuleRegistrySchema
);

// SocietyModuleConfig - stores per-society module enable/disable
export interface ISocietyModuleConfigDocument extends Document {
  societyId: string;
  moduleCode: string;
  isEnabled: boolean;
  enabledAt?: Date;
  enabledBy?: string;
  settings?: Record<string, any>;
  createdAt?: Date;
  updatedAt?: Date;
}

const SocietyModuleConfigSchema = new Schema(
  {
    societyId: { type: Schema.Types.ObjectId, ref: 'Society', required: true },
    moduleCode: { type: String, required: true },
    isEnabled: { type: Boolean, default: false },
    enabledAt: { type: Date },
    enabledBy: { type: Schema.Types.ObjectId, ref: 'User' },
    settings: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

SocietyModuleConfigSchema.index({ societyId: 1, moduleCode: 1 }, { unique: true });

export const SocietyModuleConfig: Model<ISocietyModuleConfigDocument> = mongoose.model<ISocietyModuleConfigDocument>(
  'SocietyModuleConfig',
  SocietyModuleConfigSchema
);
