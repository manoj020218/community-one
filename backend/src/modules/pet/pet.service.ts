import { Pet, IPetDocument } from './pet.model';
import { NotFoundError } from '../../common/errors/AppError';
import { buildPaginatedResult } from '../../common/utils/response';
import { PaginatedResult } from '../../common/types';

export interface CreatePetDto {
  societyId: string;
  flatId: string;
  ownerMemberId?: string;
  petName: string;
  petType: string;
  breed?: string;
  photoUrl?: string;
  aggressiveFlag?: boolean;
  remarks?: string;
  vaccinationExpiryDate?: string;
}

export class PetService {
  async create(dto: CreatePetDto, createdBy: string): Promise<IPetDocument> {
    return Pet.create({ ...dto, createdBy });
  }

  async findBySociety(societyId: string, page: number, limit: number): Promise<PaginatedResult<IPetDocument>> {
    const query = { societyId, isActive: true };
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      Pet.find(query).populate('flatId', 'flatNo').populate('ownerMemberId', 'name').sort({ petName: 1 }).skip(skip).limit(limit),
      Pet.countDocuments(query),
    ]);
    return buildPaginatedResult(items, total, page, limit);
  }

  async findByFlat(flatId: string): Promise<IPetDocument[]> {
    return Pet.find({ flatId, isActive: true });
  }

  async findById(id: string): Promise<IPetDocument> {
    const pet = await Pet.findById(id);
    if (!pet || !pet.isActive) throw new NotFoundError('Pet');
    return pet;
  }

  async update(id: string, dto: Partial<CreatePetDto>): Promise<IPetDocument> {
    const pet = await Pet.findByIdAndUpdate(id, dto, { new: true });
    if (!pet) throw new NotFoundError('Pet');
    return pet;
  }

  async disable(id: string): Promise<void> {
    await Pet.findByIdAndUpdate(id, { isActive: false, status: 'INACTIVE' });
  }
}

export const petService = new PetService();
