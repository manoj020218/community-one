import { PatrolAssignment, IPatrolAssignmentDocument } from './patrolAssignment.model';
import { PatrolRoute } from './patrolRoute.model';
import { User } from '../user/user.model';
import { NotFoundError, ValidationError } from '../../common/errors/AppError';

export interface CreatePatrolAssignmentDto {
  userId: string;
  routeId: string;
  shiftStart?: string;
  shiftEnd?: string;
  validFrom?: string;
  validUntil?: string;
}

export class PatrolAssignmentService {
  async create(societyId: string, dto: CreatePatrolAssignmentDto, createdBy: string): Promise<IPatrolAssignmentDocument> {
    const [guard, route] = await Promise.all([
      User.findOne({ _id: dto.userId, societyId, isActive: true }),
      PatrolRoute.findOne({ _id: dto.routeId, societyId, isActive: true }),
    ]);
    if (!guard) throw new ValidationError('Guard does not belong to this society');
    if (!route) throw new ValidationError('Route does not belong to this society');
    return PatrolAssignment.create({ societyId, ...dto, createdBy });
  }

  async findBySociety(societyId: string): Promise<IPatrolAssignmentDocument[]> {
    return PatrolAssignment.find({ societyId, isActive: true })
      .populate('userId', 'name mobile roleCode')
      .populate('routeId', 'name');
  }

  async findActiveForUser(societyId: string, userId: string): Promise<IPatrolAssignmentDocument[]> {
    const now = new Date();
    return PatrolAssignment.find({
      societyId,
      userId,
      isActive: true,
      $and: [
        { $or: [{ validFrom: { $exists: false } }, { validFrom: { $lte: now } }] },
        { $or: [{ validUntil: { $exists: false } }, { validUntil: { $gte: now } }] },
      ],
    }).populate('routeId', 'name checkpointIds alertThresholdMinutes');
  }

  async update(id: string, dto: Partial<CreatePatrolAssignmentDto>): Promise<IPatrolAssignmentDocument> {
    const assignment = await PatrolAssignment.findByIdAndUpdate(id, dto, { new: true });
    if (!assignment) throw new NotFoundError('Assignment');
    return assignment;
  }

  async disable(id: string): Promise<void> {
    await PatrolAssignment.findByIdAndUpdate(id, { isActive: false });
  }
}

export const patrolAssignmentService = new PatrolAssignmentService();
