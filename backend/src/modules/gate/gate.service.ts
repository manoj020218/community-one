import { ConflictError, NotFoundError, ValidationError } from '../../common/errors/AppError';
import { Tower } from '../tower/tower.model';
import { Gate, IGateDocument } from './gate.model';
import { normalizeGateCode } from './gate.utils';

export interface GateMutationDto {
  societyId: string;
  name: string;
  code?: string;
  description?: string;
  towerIds?: string[];
  entryType?: 'ENTRY' | 'EXIT' | 'BOTH' | 'SERVICE';
}

export class GateService {
  async create(dto: GateMutationDto, createdBy: string): Promise<IGateDocument> {
    await this.assertTowerOwnership(dto.societyId, dto.towerIds || []);
    const code = normalizeGateCode(dto.name, dto.code);
    const existing = await Gate.findOne({ societyId: dto.societyId, code, isActive: true });
    if (existing) throw new ConflictError(`Gate ${code} already exists in this society`);
    return Gate.create({ ...dto, code, createdBy });
  }

  async findBySociety(societyId: string): Promise<IGateDocument[]> {
    return Gate.find({ societyId, isActive: true }).populate('towerIds', 'name code').sort({ name: 1 });
  }

  async findById(id: string): Promise<IGateDocument> {
    const gate = await Gate.findById(id).populate('towerIds', 'name code');
    if (!gate || !gate.isActive) throw new NotFoundError('Gate');
    return gate;
  }

  async update(id: string, dto: Partial<GateMutationDto>): Promise<IGateDocument> {
    const gate = await Gate.findById(id);
    if (!gate || !gate.isActive) throw new NotFoundError('Gate');
    await this.assertTowerOwnership(gate.societyId.toString(), dto.towerIds || gate.towerIds.map(String));
    const code = dto.name || dto.code ? normalizeGateCode(dto.name || gate.name, dto.code || gate.code) : gate.code;
    const updated = await Gate.findByIdAndUpdate(id, { ...dto, code }, { new: true, runValidators: true })
      .populate('towerIds', 'name code');
    if (!updated) throw new NotFoundError('Gate');
    return updated;
  }

  async disable(id: string): Promise<void> {
    await Gate.findByIdAndUpdate(id, { isActive: false });
  }

  async getByIds(societyId: string, gateIds: string[]): Promise<IGateDocument[]> {
    return Gate.find({ societyId, _id: { $in: gateIds }, isActive: true });
  }

  private async assertTowerOwnership(societyId: string, towerIds: string[]): Promise<void> {
    if (!towerIds.length) return;
    const count = await Tower.countDocuments({ _id: { $in: towerIds }, societyId, isActive: true });
    if (count !== towerIds.length) {
      throw new ValidationError('One or more towers do not belong to the selected society');
    }
  }
}

export const gateService = new GateService();
