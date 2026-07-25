import { NotFoundError, ValidationError } from '../../common/errors/AppError';
import { User } from '../user/user.model';
import { gateService } from '../gate/gate.service';
import { GuardAssignment, IGuardAssignmentDocument } from './guardAssignment.model';
import { isAssignmentActiveNow } from './guardAssignment.utils';

export interface GuardAssignmentDto {
  societyId: string;
  userId: string;
  gateIds: string[];
  shiftStart?: string;
  shiftEnd?: string;
  validFrom?: string;
  validUntil?: string;
}

export class GuardAssignmentService {
  async create(dto: GuardAssignmentDto, createdBy: string): Promise<IGuardAssignmentDocument> {
    await this.assertActor(dto.societyId, dto.userId);
    await this.assertGateOwnership(dto.societyId, dto.gateIds);
    return GuardAssignment.create({ ...dto, createdBy });
  }

  async findBySociety(societyId: string): Promise<IGuardAssignmentDocument[]> {
    return GuardAssignment.find({ societyId, isActive: true }).populate('userId', 'name email roleCode').populate('gateIds', 'name code');
  }

  async update(id: string, dto: Partial<GuardAssignmentDto>): Promise<IGuardAssignmentDocument> {
    const assignment = await GuardAssignment.findById(id);
    if (!assignment || !assignment.isActive) throw new NotFoundError('Guard assignment');
    const societyId = assignment.societyId.toString();
    if (dto.userId) await this.assertActor(societyId, dto.userId);
    if (dto.gateIds) await this.assertGateOwnership(societyId, dto.gateIds);
    const updated = await GuardAssignment.findByIdAndUpdate(id, dto, { new: true, runValidators: true })
      .populate('userId', 'name email roleCode')
      .populate('gateIds', 'name code');
    if (!updated) throw new NotFoundError('Guard assignment');
    return updated;
  }

  async disable(id: string): Promise<void> {
    await GuardAssignment.findByIdAndUpdate(id, { isActive: false });
  }

  async findActiveForUser(societyId: string, userId: string): Promise<IGuardAssignmentDocument[]> {
    const assignments = await GuardAssignment.find({ societyId, userId, isActive: true }).populate('gateIds', 'name code entryType');
    return assignments.filter((assignment) => isAssignmentActiveNow(assignment));
  }

  async getActiveGateIdsForUser(societyId: string, userId: string): Promise<string[]> {
    const assignments = await this.findActiveForUser(societyId, userId);
    return [
      ...new Set(
        assignments.flatMap((assignment) => assignment.gateIds.map((gate: any) => String(gate?._id || gate)))
      ),
    ];
  }

  private async assertActor(societyId: string, userId: string): Promise<void> {
    const user = await User.findOne({ _id: userId, societyId, isActive: true });
    if (!user) throw new ValidationError('Assigned user does not belong to this society');
  }

  private async assertGateOwnership(societyId: string, gateIds: string[]): Promise<void> {
    const gates = await gateService.getByIds(societyId, gateIds);
    if (gates.length !== gateIds.length) throw new ValidationError('One or more gates do not belong to this society');
  }
}

export const guardAssignmentService = new GuardAssignmentService();
