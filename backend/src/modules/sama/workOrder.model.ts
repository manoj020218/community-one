import mongoose, { Document, Model, Schema } from 'mongoose';

export interface IWorkOrderDocument extends Document {
  societyId: string;
  workOrderCode: string;
  title: string;
  description?: string;
  category: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  status: 'OPEN' | 'ASSIGNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  sourceType: 'ADMIN' | 'RESIDENT' | 'SYSTEM';
  flatId?: string;
  residentId?: string;
  requestedByUserId: string;
  assigneeType?: 'STAFF_PROFILE' | 'SERVICE_PROVIDER';
  assignedStaffProfileId?: string;
  assignedServiceProviderId?: string;
  accessPolicyId?: string;
  scheduledStartAt?: Date;
  scheduledEndAt?: Date;
  slaTargetMinutes?: number;
  slaDueAt?: Date;
  slaBreached?: boolean;
  assignedAt?: Date;
  assignedByUserId?: string;
  rescheduledAt?: Date;
  rescheduledByUserId?: string;
  rescheduleReason?: string;
  escalationLevel?: number;
  escalatedAt?: Date;
  escalatedByUserId?: string;
  escalationReason?: string;
  completedAt?: Date;
  completedByUserId?: string;
  completionNotes?: string;
  proofFileId?: string;
  completionProofFileIds?: string[];
  cancelledAt?: Date;
  cancelledByUserId?: string;
  cancellationReason?: string;
  residentRating?: number;
  residentFeedback?: string;
  ratedAt?: Date;
  ratedByUserId?: string;
  createdBy: string;
  updatedBy: string;
}

const WorkOrderSchema = new Schema(
  {
    societyId: { type: Schema.Types.ObjectId, ref: 'Society', required: true },
    workOrderCode: { type: String, required: true, trim: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    category: { type: String, required: true, trim: true },
    priority: { type: String, enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'], default: 'MEDIUM' },
    status: { type: String, enum: ['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'], default: 'OPEN' },
    sourceType: { type: String, enum: ['ADMIN', 'RESIDENT', 'SYSTEM'], default: 'ADMIN' },
    flatId: { type: Schema.Types.ObjectId, ref: 'Flat' },
    residentId: { type: Schema.Types.ObjectId, ref: 'Resident' },
    requestedByUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    assigneeType: { type: String, enum: ['STAFF_PROFILE', 'SERVICE_PROVIDER'] },
    assignedStaffProfileId: { type: Schema.Types.ObjectId, ref: 'StaffProfile' },
    assignedServiceProviderId: { type: Schema.Types.ObjectId, ref: 'ServiceProviderProfile' },
    accessPolicyId: { type: Schema.Types.ObjectId, ref: 'AccessPolicy' },
    scheduledStartAt: { type: Date },
    scheduledEndAt: { type: Date },
    slaTargetMinutes: { type: Number, min: 0 },
    slaDueAt: { type: Date },
    slaBreached: { type: Boolean },
    assignedAt: { type: Date },
    assignedByUserId: { type: Schema.Types.ObjectId, ref: 'User' },
    rescheduledAt: { type: Date },
    rescheduledByUserId: { type: Schema.Types.ObjectId, ref: 'User' },
    rescheduleReason: { type: String, trim: true },
    escalationLevel: { type: Number, min: 0, default: 0 },
    escalatedAt: { type: Date },
    escalatedByUserId: { type: Schema.Types.ObjectId, ref: 'User' },
    escalationReason: { type: String, trim: true },
    completedAt: { type: Date },
    completedByUserId: { type: Schema.Types.ObjectId, ref: 'User' },
    completionNotes: { type: String, trim: true },
    proofFileId: { type: Schema.Types.ObjectId, ref: 'FileAsset' },
    completionProofFileIds: [{ type: Schema.Types.ObjectId, ref: 'FileAsset' }],
    cancelledAt: { type: Date },
    cancelledByUserId: { type: Schema.Types.ObjectId, ref: 'User' },
    cancellationReason: { type: String, trim: true },
    residentRating: { type: Number, min: 1, max: 5 },
    residentFeedback: { type: String, trim: true },
    ratedAt: { type: Date },
    ratedByUserId: { type: Schema.Types.ObjectId, ref: 'User' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

WorkOrderSchema.index({ societyId: 1, workOrderCode: 1 }, { unique: true });
WorkOrderSchema.index({ societyId: 1, status: 1, priority: 1 });
WorkOrderSchema.index({ societyId: 1, flatId: 1, createdAt: -1 });

export const WorkOrder: Model<IWorkOrderDocument> = mongoose.model<IWorkOrderDocument>('WorkOrder', WorkOrderSchema);
