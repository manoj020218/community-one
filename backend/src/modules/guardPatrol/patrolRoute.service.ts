import { PatrolRoute, IPatrolRouteDocument } from './patrolRoute.model';
import { PatrolCheckpoint } from './patrolCheckpoint.model';
import { NotFoundError, ValidationError } from '../../common/errors/AppError';

export interface CreatePatrolRouteDto {
  name: string;
  checkpointIds: string[];
  alertThresholdMinutes?: number;
}

export class PatrolRouteService {
  private async assertCheckpointsBelongToSociety(societyId: string, checkpointIds: string[]): Promise<void> {
    if (!checkpointIds.length) throw new ValidationError('A route needs at least one checkpoint');
    const count = await PatrolCheckpoint.countDocuments({ _id: { $in: checkpointIds }, societyId, isActive: true });
    if (count !== checkpointIds.length) throw new ValidationError('One or more checkpoints do not belong to this society');
  }

  async create(societyId: string, dto: CreatePatrolRouteDto, createdBy: string): Promise<IPatrolRouteDocument> {
    await this.assertCheckpointsBelongToSociety(societyId, dto.checkpointIds);
    return PatrolRoute.create({ societyId, ...dto, createdBy });
  }

  async findBySociety(societyId: string): Promise<IPatrolRouteDocument[]> {
    return PatrolRoute.find({ societyId, isActive: true }).populate('checkpointIds', 'name method').sort({ name: 1 });
  }

  async findById(id: string): Promise<IPatrolRouteDocument> {
    const route = await PatrolRoute.findById(id).populate('checkpointIds', 'name method');
    if (!route) throw new NotFoundError('Route');
    return route;
  }

  async update(id: string, societyId: string, dto: Partial<CreatePatrolRouteDto>): Promise<IPatrolRouteDocument> {
    if (dto.checkpointIds) await this.assertCheckpointsBelongToSociety(societyId, dto.checkpointIds);
    const route = await PatrolRoute.findByIdAndUpdate(id, dto, { new: true });
    if (!route) throw new NotFoundError('Route');
    return route;
  }

  async disable(id: string): Promise<void> {
    await PatrolRoute.findByIdAndUpdate(id, { isActive: false });
  }
}

export const patrolRouteService = new PatrolRouteService();
