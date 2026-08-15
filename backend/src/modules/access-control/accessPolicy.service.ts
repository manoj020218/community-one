import { NotFoundError, ValidationError } from '../../common/errors/AppError';
import { Resident } from '../resident/resident.model';
import { Zone } from './zone.model';
import { CreatePolicyDto, UpdatePolicyDto } from './access-control.types';
import { AccessZonePolicy, IAccessZonePolicyDocument } from './accessPolicy.model';

const POLICY_POPULATE: Array<{ path: string; select: string }> = [
  { path: 'residentId', select: 'name mobile' },
  { path: 'zoneIds', select: 'name zoneType' },
];

export class AccessPolicyService {
  async create(dto: CreatePolicyDto, createdBy: string): Promise<IAccessZonePolicyDocument> {
    await this.assertCreateRelations(dto);
    const policy = await AccessZonePolicy.create({ ...dto, accessMode: dto.accessMode ?? 'ALWAYS', createdBy });
    return this.findById(policy._id!.toString());
  }

  async listBySociety(societyId: string, status?: string): Promise<IAccessZonePolicyDocument[]> {
    const query: Record<string, unknown> = { societyId };
    if (status) query.status = status;
    return AccessZonePolicy.find(query).populate(POLICY_POPULATE).sort({ createdAt: -1 });
  }

  async findById(id: string): Promise<IAccessZonePolicyDocument> {
    const policy = await AccessZonePolicy.findById(id).populate(POLICY_POPULATE);
    if (!policy) throw new NotFoundError('Access policy');
    return policy;
  }

  async update(id: string, dto: UpdatePolicyDto): Promise<IAccessZonePolicyDocument> {
    const policy = await AccessZonePolicy.findByIdAndUpdate(id, dto, { new: true, runValidators: true }).populate(POLICY_POPULATE);
    if (!policy) throw new NotFoundError('Access policy');
    return policy;
  }

  private async assertCreateRelations(dto: CreatePolicyDto): Promise<void> {
    const resident = await Resident.findOne({ _id: dto.residentId, societyId: dto.societyId, isActive: true });
    if (!resident) throw new NotFoundError('Resident');

    const zoneCount = await Zone.countDocuments({ _id: { $in: dto.zoneIds }, societyId: dto.societyId, isActive: true });
    if (zoneCount !== dto.zoneIds.length) throw new ValidationError('One or more zones do not belong to this society');
  }
}

export const accessPolicyService = new AccessPolicyService();
