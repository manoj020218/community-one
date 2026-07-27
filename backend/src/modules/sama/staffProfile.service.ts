import { ValidationError } from '../../common/errors/AppError';
import { buildPaginatedResult, parsePagination } from '../../common/utils/response';
import { SamaActorContext } from './sama.access.service';
import { samaNumberingService } from './samaNumbering.service';
import { StaffCategory } from './staffCategory.model';
import { StaffProfile } from './staffProfile.model';
import {
  staffProfileApproveSchema,
  staffProfileCreateSchema,
  staffProfileListQuerySchema,
  staffProfileReinstateSchema,
  staffProfileSuspendSchema,
  staffProfileTerminateSchema,
  staffProfileUpdateSchema,
} from './staffProfile.schemas';
import { parseOrThrow } from './sama.validation';

export class StaffProfileService {
  async listBySociety(societyId: string, input: unknown) {
    const query = parseOrThrow(staffProfileListQuerySchema, input);
    const filter: Record<string, unknown> = { societyId };
    if (query.staffType) filter.staffType = query.staffType;
    if (query.accessStatus) filter.accessStatus = query.accessStatus;
    if (query.lifecycleStatus) filter.lifecycleStatus = query.lifecycleStatus;
    if (query.search) {
      const term = new RegExp(query.search, 'i');
      filter.$or = [{ displayName: term }, { staffCode: term }, { mobile: term }, { primaryCategory: term }];
    }
    const { page, limit, skip } = parsePagination(query);
    const [items, total] = await Promise.all([
      StaffProfile.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      StaffProfile.countDocuments(filter),
    ]);
    return buildPaginatedResult(items, total, page, limit);
  }

  async create(context: SamaActorContext, input: unknown) {
    const dto = parseOrThrow(staffProfileCreateSchema, input);
    const category = await this.findCategory(context.societyId, dto.staffType, dto.primaryCategory);
    const lifecycle = this.lifecycleFromCategory(category);
    return StaffProfile.create({
      societyId: context.societyId,
      ...dto,
      primaryCategory: category?.code || dto.primaryCategory,
      staffCode: await samaNumberingService.nextStaffCode(context.societyId),
      lifecycleStatus: lifecycle.lifecycleStatus,
      accessStatus: lifecycle.accessStatus,
      verificationStatus: lifecycle.verificationStatus,
      approvedAt: lifecycle.verificationStatus === 'APPROVED' ? new Date() : undefined,
      approvedByUserId: lifecycle.verificationStatus === 'APPROVED' ? context.user.userId : undefined,
      createdBy: context.user.userId,
      updatedBy: context.user.userId,
    });
  }

  async update(context: SamaActorContext, staffId: string, input: unknown) {
    const dto = parseOrThrow(staffProfileUpdateSchema, input);
    const staff = await StaffProfile.findOne({ _id: staffId, societyId: context.societyId }).orFail();
    const category = await this.findCategory(context.societyId, staff.staffType, dto.primaryCategory || staff.primaryCategory);
    Object.assign(staff, dto, { updatedBy: context.user.userId, primaryCategory: category?.code || dto.primaryCategory || staff.primaryCategory });
    if (category?.requiresSocietyApproval && staff.verificationStatus !== 'APPROVED' && staff.lifecycleStatus !== 'TERMINATED') {
      staff.lifecycleStatus = 'SUSPENDED';
      staff.accessStatus = 'SUSPENDED';
      staff.verificationStatus = 'PENDING';
    }
    if (category && !category.requiresSocietyApproval && staff.lifecycleStatus !== 'TERMINATED') {
      staff.lifecycleStatus = 'ACTIVE';
      staff.accessStatus = 'ACTIVE';
      staff.verificationStatus = 'APPROVED';
      staff.approvedAt = staff.approvedAt || new Date();
      staff.approvedByUserId = staff.approvedByUserId || context.user.userId;
    }
    await staff.save();
    return staff;
  }

  async approve(context: SamaActorContext, staffId: string, input: unknown) {
    parseOrThrow(staffProfileApproveSchema, input);
    const staff = await StaffProfile.findOne({ _id: staffId, societyId: context.societyId }).orFail();
    if (staff.lifecycleStatus === 'TERMINATED') throw new ValidationError('Terminated staff cannot be approved');
    staff.verificationStatus = 'APPROVED';
    staff.lifecycleStatus = 'ACTIVE';
    staff.accessStatus = 'ACTIVE';
    staff.approvedAt = new Date();
    staff.approvedByUserId = context.user.userId;
    staff.updatedBy = context.user.userId;
    await staff.save();
    return staff;
  }

  async suspend(context: SamaActorContext, staffId: string, input: unknown) {
    const dto = parseOrThrow(staffProfileSuspendSchema, input);
    const staff = await StaffProfile.findOne({ _id: staffId, societyId: context.societyId }).orFail();
    if (staff.lifecycleStatus === 'TERMINATED') throw new ValidationError('Terminated staff cannot be suspended');
    staff.lifecycleStatus = 'SUSPENDED';
    staff.accessStatus = 'SUSPENDED';
    staff.suspendedAt = new Date();
    staff.suspendedByUserId = context.user.userId;
    staff.suspensionReason = dto.reason;
    staff.updatedBy = context.user.userId;
    await staff.save();
    return staff;
  }

  async reinstate(context: SamaActorContext, staffId: string, input: unknown) {
    parseOrThrow(staffProfileReinstateSchema, input);
    const staff = await StaffProfile.findOne({ _id: staffId, societyId: context.societyId }).orFail();
    if (staff.lifecycleStatus === 'TERMINATED') throw new ValidationError('Terminated staff cannot be reinstated');
    if (staff.verificationStatus !== 'APPROVED') throw new ValidationError('Staff must be approved before reinstatement');
    staff.lifecycleStatus = 'ACTIVE';
    staff.accessStatus = 'ACTIVE';
    staff.suspensionReason = undefined;
    staff.updatedBy = context.user.userId;
    await staff.save();
    return staff;
  }

  async terminate(context: SamaActorContext, staffId: string, input: unknown) {
    const dto = parseOrThrow(staffProfileTerminateSchema, input);
    const staff = await StaffProfile.findOne({ _id: staffId, societyId: context.societyId }).orFail();
    staff.lifecycleStatus = 'TERMINATED';
    staff.accessStatus = 'BLOCKED';
    staff.terminatedAt = new Date();
    staff.terminatedByUserId = context.user.userId;
    staff.terminationReason = dto.reason;
    staff.updatedBy = context.user.userId;
    await staff.save();
    return staff;
  }

  private async findCategory(societyId: string, staffType: string, primaryCategory?: string) {
    if (!primaryCategory) return null;
    const category = await StaffCategory.findOne({ societyId, code: primaryCategory.toUpperCase(), isActive: true });
    if (!category) throw new ValidationError('Invalid staff category for this society');
    if (!category.staffTypes.includes(staffType)) throw new ValidationError('Staff category does not support this staff type');
    return category;
  }

  private lifecycleFromCategory(category: { code: string; requiresSocietyApproval: boolean } | null) {
    if (category?.requiresSocietyApproval) {
      return { lifecycleStatus: 'SUSPENDED', accessStatus: 'SUSPENDED', verificationStatus: 'PENDING' } as const;
    }
    return { lifecycleStatus: 'ACTIVE', accessStatus: 'ACTIVE', verificationStatus: 'APPROVED' } as const;
  }
}

export const staffProfileService = new StaffProfileService();
