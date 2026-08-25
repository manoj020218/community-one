import crypto from 'crypto';
import { PatrolCheckpoint, IPatrolCheckpointDocument, PatrolCheckpointMethod } from './patrolCheckpoint.model';
import { NotFoundError, ConflictError } from '../../common/errors/AppError';

export interface CreatePatrolCheckpointDto {
  name: string;
  method: PatrolCheckpointMethod;
  towerId?: string;
  nfcTagUid?: string; // required when method === 'NFC' — the physical tag's own UID
}

export class PatrolCheckpointService {
  async create(societyId: string, dto: CreatePatrolCheckpointDto, createdBy: string): Promise<IPatrolCheckpointDocument> {
    if (dto.method === 'NFC' && !dto.nfcTagUid?.trim()) {
      throw new ConflictError('NFC tag UID is required for an NFC checkpoint');
    }
    const token = dto.method === 'NFC' ? dto.nfcTagUid!.trim() : crypto.randomBytes(16).toString('hex');
    return PatrolCheckpoint.create({ societyId, name: dto.name, method: dto.method, towerId: dto.towerId, token, createdBy });
  }

  async findBySociety(societyId: string): Promise<IPatrolCheckpointDocument[]> {
    return PatrolCheckpoint.find({ societyId, isActive: true }).populate('towerId', 'name code').sort({ name: 1 });
  }

  async findById(id: string): Promise<IPatrolCheckpointDocument> {
    const checkpoint = await PatrolCheckpoint.findById(id);
    if (!checkpoint) throw new NotFoundError('Checkpoint');
    return checkpoint;
  }

  async findByToken(token: string): Promise<IPatrolCheckpointDocument> {
    const checkpoint = await PatrolCheckpoint.findOne({ token, isActive: true });
    if (!checkpoint) throw new NotFoundError('Checkpoint');
    return checkpoint;
  }

  async update(id: string, dto: Partial<Pick<CreatePatrolCheckpointDto, 'name' | 'towerId'>>): Promise<IPatrolCheckpointDocument> {
    const checkpoint = await PatrolCheckpoint.findByIdAndUpdate(id, dto, { new: true });
    if (!checkpoint) throw new NotFoundError('Checkpoint');
    return checkpoint;
  }

  async disable(id: string): Promise<void> {
    await PatrolCheckpoint.findByIdAndUpdate(id, { isActive: false });
  }
}

export const patrolCheckpointService = new PatrolCheckpointService();
