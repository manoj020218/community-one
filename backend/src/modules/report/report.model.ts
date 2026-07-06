import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IReportDefinitionDocument extends Document {
  code: string;
  name: string;
  moduleCode: string;
  description: string;
  filters: string[];
  exportFormats: string[];
  requiredPermission: string;
  isActive: boolean;
}

const ReportDefinitionSchema = new Schema(
  {
    code: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    moduleCode: { type: String, default: 'CORE' },
    description: { type: String },
    filters: [{ type: String }],
    exportFormats: [{ type: String, enum: ['PDF','EXCEL','CSV','PRINT'] }],
    requiredPermission: { type: String, default: 'report.read' },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const ReportDefinition: Model<IReportDefinitionDocument> = mongoose.model<IReportDefinitionDocument>(
  'ReportDefinition',
  ReportDefinitionSchema
);
