import { Resident, IResidentDocument } from './resident.model';
import { NotFoundError } from '../../common/errors/AppError';
import { buildPaginatedResult } from '../../common/utils/response';
import { PaginatedResult } from '../../common/types';

export interface CreateResidentDto {
  societyId: string;
  flatId: string;
  name: string;
  mobile: string;
  email?: string;
  photoUrl?: string;
  relation?: string;
  memberType: string;
  loginAllowed?: boolean;
  primaryContact?: boolean;
  emergencyContact?: string;
  moveInDate?: string;
}

export interface MarkKycDto {
  physicalLocation: string;
  notes?: string;
}

export class ResidentService {
  async create(dto: CreateResidentDto, createdBy: string): Promise<IResidentDocument> {
    return Resident.create({ ...dto, createdBy });
  }

  async findBySociety(societyId: string, page: number, limit: number, search?: string): Promise<PaginatedResult<IResidentDocument>> {
    const query: any = { societyId, isActive: true };
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { mobile: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      Resident.find(query)
        .populate('flatId', 'flatNo')
        .populate('kycVerifiedBy', 'name')
        .sort({ name: 1 })
        .skip(skip)
        .limit(limit),
      Resident.countDocuments(query),
    ]);
    return buildPaginatedResult(items, total, page, limit);
  }

  async findByFlat(flatId: string): Promise<IResidentDocument[]> {
    return Resident.find({ flatId, isActive: true })
      .populate('kycVerifiedBy', 'name')
      .sort({ primaryContact: -1, name: 1 });
  }

  async findById(id: string): Promise<IResidentDocument> {
    const resident = await Resident.findById(id)
      .populate('flatId', 'flatNo')
      .populate('kycVerifiedBy', 'name');
    if (!resident || !resident.isActive) throw new NotFoundError('Resident');
    return resident;
  }

  async update(id: string, dto: Partial<CreateResidentDto>): Promise<IResidentDocument> {
    const resident = await Resident.findByIdAndUpdate(id, dto, { new: true });
    if (!resident) throw new NotFoundError('Resident');
    return resident;
  }

  async markKycVerified(id: string, dto: MarkKycDto, verifiedByUserId: string): Promise<IResidentDocument> {
    const resident = await Resident.findByIdAndUpdate(
      id,
      {
        kycStatus: 'VERIFIED',
        kycVerifiedBy: verifiedByUserId,
        kycVerifiedAt: new Date(),
        kycPhysicalLocation: dto.physicalLocation,
        kycNotes: dto.notes,
      },
      { new: true }
    )
      .populate('flatId', 'flatNo')
      .populate('kycVerifiedBy', 'name');
    if (!resident) throw new NotFoundError('Resident');
    return resident;
  }

  async disable(id: string): Promise<void> {
    await Resident.findByIdAndUpdate(id, { isActive: false, status: 'INACTIVE' });
  }

  async getCountBySociety(societyId: string): Promise<number> {
    return Resident.countDocuments({ societyId, isActive: true });
  }
}

export const residentService = new ResidentService();
