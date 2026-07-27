import { ForbiddenError, ValidationError } from '../../common/errors/AppError';
import { buildPaginatedResult, parsePagination } from '../../common/utils/response';
import { Flat } from '../flat/flat.model';
import { Resident } from '../resident/resident.model';
import { SamaActorContext } from './sama.access.service';
import { samaFileValidationService } from './samaFileValidation.service';
import { samaNumberingService } from './samaNumbering.service';
import { samaSubjectService } from './samaSubject.service';
import { parseOrThrow } from './sama.validation';
import { ServiceProviderProfile } from './serviceProviderProfile.model';
import { StaffProfile } from './staffProfile.model';
import { WorkOrder } from './workOrder.model';
import {
  workOrderAssignSchema,
  workOrderCancelSchema,
  workOrderCompleteSchema,
  workOrderCreateSchema,
  workOrderEscalateSchema,
  workOrderListQuerySchema,
  workOrderRateSchema,
  workOrderRescheduleSchema,
} from './workOrder.schemas';

function computeSlaDueAt(startAt?: Date, targetMinutes?: number) {
  return startAt && typeof targetMinutes === 'number' ? new Date(startAt.getTime() + targetMinutes * 60_000) : undefined;
}

async function resolveResidentContext(societyId: string, flatId?: string, residentId?: string) {
  const [flat, resident] = await Promise.all([
    flatId ? Flat.findOne({ _id: flatId, societyId }) : null,
    residentId ? Resident.findOne({ _id: residentId, societyId }) : null,
  ]);
  if (flatId && !flat) throw new ValidationError('Invalid flat for this society');
  if (residentId && !resident) throw new ValidationError('Invalid resident for this society');
  if (flat && resident && resident.flatId.toString() !== flat._id.toString()) {
    throw new ValidationError('Resident does not belong to the selected flat');
  }
  return { flatId: flat?._id?.toString() || resident?.flatId?.toString(), residentId: resident?._id?.toString() };
}

export class WorkOrderService {
  async listBySociety(societyId: string, input: unknown) {
    const query = parseOrThrow(workOrderListQuerySchema, input);
    const filter: Record<string, unknown> = { societyId };
    if (query.status) filter.status = query.status;
    if (query.priority) filter.priority = query.priority;
    if (query.assigneeType) filter.assigneeType = query.assigneeType;
    if (query.flatId) filter.flatId = query.flatId;
    if (query.escalatedOnly) filter.escalationLevel = { $gt: 0 };
    if (query.search) {
      const term = new RegExp(query.search, 'i');
      filter.$or = [{ title: term }, { category: term }, { workOrderCode: term }];
    }
    const { page, limit, skip } = parsePagination(query);
    const [items, total] = await Promise.all([
      WorkOrder.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      WorkOrder.countDocuments(filter),
    ]);
    return buildPaginatedResult(items, total, page, limit);
  }

  async create(context: SamaActorContext, input: unknown) {
    const dto = parseOrThrow(workOrderCreateSchema, input);
    const scope = await resolveResidentContext(context.societyId, dto.flatId, dto.residentId);
    return WorkOrder.create({
      societyId: context.societyId,
      ...dto,
      ...scope,
      workOrderCode: await samaNumberingService.nextWorkOrderCode(context.societyId),
      slaTargetMinutes: dto.slaTargetMinutes,
      slaDueAt: computeSlaDueAt(dto.scheduledStartAt, dto.slaTargetMinutes),
      requestedByUserId: context.user.userId,
      createdBy: context.user.userId,
      updatedBy: context.user.userId,
    });
  }

  async assign(context: SamaActorContext, workOrderId: string, input: unknown) {
    const dto = parseOrThrow(workOrderAssignSchema, input);
    const workOrder = await WorkOrder.findOne({ _id: workOrderId, societyId: context.societyId }).orFail();
    if (['COMPLETED', 'CANCELLED'].includes(workOrder.status)) throw new ValidationError('Completed or cancelled work orders cannot be reassigned');
    const assignee = dto.assignedStaffProfileId
      ? await StaffProfile.findOne({ _id: dto.assignedStaffProfileId, societyId: context.societyId }).orFail()
      : await ServiceProviderProfile.findOne({ _id: dto.assignedServiceProviderId, societyId: context.societyId }).orFail();
    if ('accessStatus' in assignee && assignee.accessStatus !== 'ACTIVE') throw new ValidationError('Assigned staff is not active');
    if ('status' in assignee && assignee.status !== 'ACTIVE') throw new ValidationError('Assigned service provider is not active');
    if (dto.accessPolicyId) {
      const policy = await samaSubjectService.getActivePolicy(context.societyId, dto.accessPolicyId);
      const subjectType = dto.assignedStaffProfileId ? 'STAFF_PROFILE' : 'SERVICE_PROVIDER';
      const subjectId = dto.assignedStaffProfileId || dto.assignedServiceProviderId!;
      samaSubjectService.ensurePolicyMatches(policy, subjectType, subjectId, { workOrderId: workOrder._id.toString() });
    }
    workOrder.assigneeType = dto.assignedStaffProfileId ? 'STAFF_PROFILE' : 'SERVICE_PROVIDER';
    workOrder.assignedStaffProfileId = dto.assignedStaffProfileId;
    workOrder.assignedServiceProviderId = dto.assignedServiceProviderId;
    workOrder.accessPolicyId = dto.accessPolicyId;
    workOrder.scheduledStartAt = dto.scheduledStartAt || workOrder.scheduledStartAt;
    workOrder.scheduledEndAt = dto.scheduledEndAt || workOrder.scheduledEndAt;
    workOrder.slaTargetMinutes = dto.slaTargetMinutes ?? workOrder.slaTargetMinutes;
    workOrder.slaDueAt = computeSlaDueAt(workOrder.scheduledStartAt, workOrder.slaTargetMinutes);
    workOrder.assignedAt = new Date();
    workOrder.assignedByUserId = context.user.userId;
    workOrder.status = 'ASSIGNED';
    workOrder.updatedBy = context.user.userId;
    await workOrder.save();
    return workOrder;
  }

  async complete(context: SamaActorContext, workOrderId: string, input: unknown) {
    const dto = parseOrThrow(workOrderCompleteSchema, input);
    const workOrder = await WorkOrder.findOne({ _id: workOrderId, societyId: context.societyId }).orFail();
    if (['COMPLETED', 'CANCELLED'].includes(workOrder.status)) throw new ValidationError('Work order is already closed');
    if (!workOrder.assigneeType) throw new ValidationError('Work order must be assigned before completion');
    await samaFileValidationService.assertSocietyFiles(context.societyId, [dto.proofFileId, ...(dto.completionProofFileIds || [])].filter(Boolean) as string[]);
    workOrder.status = 'COMPLETED';
    workOrder.completedAt = new Date();
    workOrder.completedByUserId = context.user.userId;
    workOrder.completionNotes = dto.completionNotes;
    workOrder.proofFileId = dto.proofFileId;
    workOrder.completionProofFileIds = dto.completionProofFileIds;
    workOrder.slaBreached = Boolean(workOrder.slaDueAt && workOrder.completedAt > workOrder.slaDueAt);
    workOrder.updatedBy = context.user.userId;
    await workOrder.save();
    return workOrder;
  }

  async cancel(context: SamaActorContext, workOrderId: string, input: unknown) {
    const dto = parseOrThrow(workOrderCancelSchema, input);
    const workOrder = await WorkOrder.findOne({ _id: workOrderId, societyId: context.societyId }).orFail();
    if (['COMPLETED', 'CANCELLED'].includes(workOrder.status)) throw new ValidationError('Closed work orders cannot be cancelled');
    workOrder.status = 'CANCELLED';
    workOrder.cancelledAt = new Date();
    workOrder.cancelledByUserId = context.user.userId;
    workOrder.cancellationReason = dto.cancellationReason;
    workOrder.updatedBy = context.user.userId;
    await workOrder.save();
    return workOrder;
  }

  async reschedule(context: SamaActorContext, workOrderId: string, input: unknown) {
    const dto = parseOrThrow(workOrderRescheduleSchema, input);
    const workOrder = await WorkOrder.findOne({ _id: workOrderId, societyId: context.societyId }).orFail();
    if (['COMPLETED', 'CANCELLED'].includes(workOrder.status)) throw new ValidationError('Closed work orders cannot be rescheduled');
    workOrder.scheduledStartAt = dto.scheduledStartAt || workOrder.scheduledStartAt;
    workOrder.scheduledEndAt = dto.scheduledEndAt || workOrder.scheduledEndAt;
    workOrder.slaTargetMinutes = dto.slaTargetMinutes ?? workOrder.slaTargetMinutes;
    workOrder.slaDueAt = computeSlaDueAt(workOrder.scheduledStartAt, workOrder.slaTargetMinutes);
    workOrder.rescheduledAt = new Date();
    workOrder.rescheduledByUserId = context.user.userId;
    workOrder.rescheduleReason = dto.rescheduleReason;
    workOrder.updatedBy = context.user.userId;
    await workOrder.save();
    return workOrder;
  }

  async escalate(context: SamaActorContext, workOrderId: string, input: unknown) {
    const dto = parseOrThrow(workOrderEscalateSchema, input);
    const workOrder = await WorkOrder.findOne({ _id: workOrderId, societyId: context.societyId }).orFail();
    if (['COMPLETED', 'CANCELLED'].includes(workOrder.status)) throw new ValidationError('Closed work orders cannot be escalated');
    workOrder.escalationLevel = Number(workOrder.escalationLevel || 0) + 1;
    workOrder.escalatedAt = new Date();
    workOrder.escalatedByUserId = context.user.userId;
    workOrder.escalationReason = dto.escalationReason;
    if (dto.priority) workOrder.priority = dto.priority;
    if (workOrder.status === 'OPEN') workOrder.status = 'IN_PROGRESS';
    workOrder.updatedBy = context.user.userId;
    await workOrder.save();
    return workOrder;
  }

  async rate(context: SamaActorContext, workOrderId: string, input: unknown) {
    const dto = parseOrThrow(workOrderRateSchema, input);
    const workOrder = await WorkOrder.findOne({ _id: workOrderId, societyId: context.societyId }).orFail();
    if (workOrder.status !== 'COMPLETED') throw new ValidationError('Only completed work orders can be rated');
    if (!context.user.permissions.includes('sama.view_society')) {
      if (!context.user.flatId || context.user.flatId !== workOrder.flatId?.toString()) throw new ForbiddenError('This work order does not belong to your flat');
    }
    workOrder.residentRating = dto.rating;
    workOrder.residentFeedback = dto.feedback;
    workOrder.ratedAt = new Date();
    workOrder.ratedByUserId = context.user.userId;
    workOrder.updatedBy = context.user.userId;
    await workOrder.save();
    return workOrder;
  }
}

export const workOrderService = new WorkOrderService();
