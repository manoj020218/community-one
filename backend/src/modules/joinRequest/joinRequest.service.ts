import { JoinRequest, IJoinRequestDocument } from './joinRequest.model';
import { Society } from '../society/society.model';
import { Resident } from '../resident/resident.model';
import { User } from '../user/user.model';
import { residentService } from '../resident/resident.service';
import { notificationService } from '../notification/notification.service';
import { NotFoundError, ConflictError, ValidationError } from '../../common/errors/AppError';
import { buildPaginatedResult } from '../../common/utils/response';
import { PaginatedResult } from '../../common/types';
import { SubmitJoinRequestDto, ApproveJoinRequestDto, RejectJoinRequestDto } from './joinRequest.types';

// Only SOCIETY_ADMIN holds RESIDENT_JOIN_REVIEW (see seeds/permissions.seed.ts) — matches
// who can already create/update residents, so this doesn't notify anyone who can't act on it.
const ADMIN_ROLE_CODES = ['SOCIETY_ADMIN'];

export class JoinRequestService {
  // Never returns anything beyond {societyId, name} — the whole point is that a member
  // proves they already know the code instead of picking from a list of every society on
  // the platform.
  async lookupSociety(code: string): Promise<{ societyId: string; name: string }> {
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) throw new ValidationError('Society code is required');

    const society = await Society.findOne({ code: trimmed, isActive: true }).select('name');
    if (!society) throw new NotFoundError('Society with this code');

    return { societyId: society._id!.toString(), name: society.name };
  }

  async submit(dto: SubmitJoinRequestDto): Promise<IJoinRequestDocument> {
    const { societyId } = await this.lookupSociety(dto.societyCode);

    const mobile = dto.mobile.trim();
    if (!mobile) throw new ValidationError('Mobile number is required');

    const existingUser = await User.findOne({ mobile, isActive: true });
    if (existingUser) {
      throw new ConflictError('An account already exists for this mobile number — try logging in, or ask your admin to reset your password.');
    }

    const existingPending = await JoinRequest.findOne({ societyId, mobile, status: 'PENDING' });
    if (existingPending) {
      throw new ConflictError('A request for this mobile number is already pending review with your society admin.');
    }

    // Matches an existing Resident record admin already created but hasn't granted a login
    // for yet — the join-request review screen uses this to skip straight to "Approve &
    // Grant Login" instead of asking the admin to pick a flat for someone already on file.
    const matched = await Resident.findOne({
      societyId,
      mobile,
      isActive: true,
      userId: { $exists: false },
    }).select('_id');

    const joinRequest = await JoinRequest.create({
      societyId,
      name: dto.name.trim(),
      mobile,
      email: dto.email?.trim(),
      claimedFlatNo: dto.claimedFlatNo?.trim(),
      matchedResidentId: matched?._id,
    });

    await this.notifyAdmins(societyId, joinRequest);

    return joinRequest;
  }

  async findBySociety(societyId: string, status?: string): Promise<IJoinRequestDocument[]> {
    const query: Record<string, unknown> = { societyId };
    if (status) query.status = status;
    return JoinRequest.find(query)
      .sort({ createdAt: -1 })
      .populate({ path: 'matchedResidentId', select: 'name flatId', populate: { path: 'flatId', select: 'flatNo' } });
  }

  async findBySocietyPaginated(societyId: string, status: string | undefined, page: number, limit: number): Promise<PaginatedResult<IJoinRequestDocument>> {
    const query: Record<string, unknown> = { societyId };
    if (status) query.status = status;
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      JoinRequest.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate({ path: 'matchedResidentId', select: 'name flatId', populate: { path: 'flatId', select: 'flatNo' } }),
      JoinRequest.countDocuments(query),
    ]);
    return buildPaginatedResult(items, total, page, limit);
  }

  async approve(id: string, actorSocietyId: string, actorUserId: string, dto: ApproveJoinRequestDto): Promise<IJoinRequestDocument> {
    const joinRequest = await JoinRequest.findById(id);
    if (!joinRequest || joinRequest.societyId.toString() !== actorSocietyId) throw new NotFoundError('Join request');
    if (joinRequest.status !== 'PENDING') throw new ConflictError('This request has already been reviewed');

    let residentId = joinRequest.matchedResidentId;

    if (!residentId) {
      if (!dto.flatId || !dto.memberType) {
        throw new ValidationError('flatId and memberType are required to approve a request with no matching resident');
      }
      const resident = await residentService.create(
        {
          societyId: actorSocietyId,
          flatId: dto.flatId,
          name: joinRequest.name,
          mobile: joinRequest.mobile,
          email: joinRequest.email,
          memberType: dto.memberType,
          primaryContact: dto.primaryContact,
        },
        actorUserId
      );
      residentId = resident._id!.toString();
    }

    const { user, resident } = await residentService.grantLogin(residentId.toString(), actorSocietyId, dto.password);

    joinRequest.status = 'APPROVED';
    joinRequest.reviewedBy = actorUserId;
    joinRequest.reviewedAt = new Date();
    joinRequest.resultingResidentId = resident._id!.toString();
    joinRequest.resultingUserId = user._id!.toString();
    await joinRequest.save();

    return joinRequest;
  }

  async reject(id: string, actorSocietyId: string, actorUserId: string, dto: RejectJoinRequestDto): Promise<IJoinRequestDocument> {
    const joinRequest = await JoinRequest.findById(id);
    if (!joinRequest || joinRequest.societyId.toString() !== actorSocietyId) throw new NotFoundError('Join request');
    if (joinRequest.status !== 'PENDING') throw new ConflictError('This request has already been reviewed');

    joinRequest.status = 'REJECTED';
    joinRequest.reviewedBy = actorUserId;
    joinRequest.reviewedAt = new Date();
    joinRequest.rejectionReason = dto.reason?.trim();
    await joinRequest.save();

    return joinRequest;
  }

  private async notifyAdmins(societyId: string, joinRequest: IJoinRequestDocument): Promise<void> {
    const admins = await User.find({ societyId, roleCode: { $in: ADMIN_ROLE_CODES }, isActive: true }).select('_id');
    if (!admins.length) return;

    await notificationService.createBulk(
      admins.map((admin) => ({
        societyId,
        userId: admin._id!.toString(),
        title: joinRequest.matchedResidentId ? 'New join request (matched resident)' : 'New join request',
        message: `${joinRequest.name} (${joinRequest.mobile}) wants to join using the society code.`,
        type: 'APPROVAL',
        moduleCode: 'CORE',
        actionUrl: '/join-requests',
        entityType: 'JoinRequest',
        entityId: joinRequest._id!.toString(),
      }))
    );
  }
}

export const joinRequestService = new JoinRequestService();
