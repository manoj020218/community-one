import { ConflictError, NotFoundError, ValidationError } from '../../common/errors/AppError';
import { buildPaginatedResult, parsePagination } from '../../common/utils/response';
import { hashPassword } from '../../common/utils/password';
import { roleService } from '../role/role.service';
import { User } from '../user/user.model';
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

const PASSWORD_ADJECTIVES = ['Blue', 'Green', 'Royal', 'Silver', 'Golden', 'Smart', 'Grand', 'Swift', 'Bright', 'Clear'];
const PASSWORD_NOUNS = ['Tiger', 'Diamond', 'Eagle', 'Crown', 'Ridge', 'Peak', 'Grove', 'Valley', 'River', 'Stone'];

function generatePassword(): string {
  const adj = PASSWORD_ADJECTIVES[Math.floor(Math.random() * PASSWORD_ADJECTIVES.length)];
  const noun = PASSWORD_NOUNS[Math.floor(Math.random() * PASSWORD_NOUNS.length)];
  const num = Math.floor(1000 + Math.random() * 9000);
  return `${adj}${noun}@${num}`;
}

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

  /** Guard-category staff are usually functionally illiterate and never self-register — an
   * admin generates their login credentials on their behalf and hands them over directly. */
  async generateLogin(context: SamaActorContext, staffId: string) {
    const staff = await StaffProfile.findOne({ _id: staffId, societyId: context.societyId }).orFail();
    if (staff.primaryCategory !== 'GUARD') throw new ValidationError('Only staff in the Guard category can be issued a login');
    if (staff.linkedUserId) throw new ConflictError('This staff member already has a login — use reset password instead');

    const tempPassword = generatePassword();
    const passwordHash = await hashPassword(tempPassword);
    const permissions = await roleService.getPermissionsForRole('SECURITY_GUARD');
    const user = await User.create({
      name: staff.displayName,
      // staffCode is only unique within a society, but User.email must be globally unique —
      // fold in societyId so two societies' identically-coded guards never collide.
      email: `${staff.staffCode.toLowerCase()}.${context.societyId}@guard.internal.jenix`,
      mobile: staff.mobile,
      passwordHash,
      roleCode: 'SECURITY_GUARD',
      permissions,
      societyId: context.societyId,
      isActive: true,
      isEmailVerified: true,
      isMobileVerified: true,
    });

    staff.linkedUserId = user._id!.toString();
    staff.updatedBy = context.user.userId;
    await staff.save();

    return { staffId: staff._id!.toString(), username: staff.mobile, tempPassword, generatedAt: new Date() };
  }

  async resetLoginPassword(context: SamaActorContext, staffId: string) {
    const staff = await StaffProfile.findOne({ _id: staffId, societyId: context.societyId }).orFail();
    if (!staff.linkedUserId) throw new NotFoundError('Login for this staff member');

    const tempPassword = generatePassword();
    const passwordHash = await hashPassword(tempPassword);
    await User.findByIdAndUpdate(staff.linkedUserId, { passwordHash });
    staff.updatedBy = context.user.userId;
    await staff.save();

    return { staffId: staff._id!.toString(), username: staff.mobile, tempPassword, generatedAt: new Date() };
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
