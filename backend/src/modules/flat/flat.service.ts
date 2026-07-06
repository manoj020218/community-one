import { Flat, IFlatDocument } from './flat.model';
import { NotFoundError } from '../../common/errors/AppError';
import { buildPaginatedResult } from '../../common/utils/response';
import { PaginatedResult } from '../../common/types';

export interface CreateFlatDto {
  societyId: string;
  towerId: string;
  floorId: string;
  flatNo: string;
  flatType?: string;
  areaSqFt?: number;
  occupancyStatus?: string;
  parkingSlots?: number;
  maintenanceCategory?: string;
}

export interface GenerateFlatsDto {
  societyId: string;
  towerId: string;
  floorId: string;
  floorNumber: number;
  towerCode: string;
  flatsPerFloor: number;
  flatType?: string;
  startUnit?: number;
}

export class FlatService {
  async create(dto: CreateFlatDto, createdBy: string): Promise<IFlatDocument> {
    return Flat.create({ ...dto, createdBy });
  }

  async generateFlats(dto: GenerateFlatsDto, createdBy: string): Promise<IFlatDocument[]> {
    const flats = [];
    const startUnit = dto.startUnit || 1;
    for (let i = 0; i < dto.flatsPerFloor; i++) {
      const unit = String(startUnit + i).padStart(2, '0');
      const flatNo = `${dto.towerCode}-${dto.floorNumber}${unit}`;
      const exists = await Flat.findOne({ societyId: dto.societyId, flatNo });
      if (!exists) {
        flats.push({
          societyId: dto.societyId,
          towerId: dto.towerId,
          floorId: dto.floorId,
          flatNo,
          flatType: dto.flatType || '2BHK',
          createdBy,
        });
      }
    }
    return Flat.insertMany(flats) as any;
  }

  async findBySociety(societyId: string, page: number, limit: number): Promise<PaginatedResult<IFlatDocument>> {
    const skip = (page - 1) * limit;
    const query = { societyId, isActive: true };
    const [items, total] = await Promise.all([
      Flat.find(query).populate('towerId', 'name code').populate('floorId', 'floorNumber floorName').sort({ flatNo: 1 }).skip(skip).limit(limit),
      Flat.countDocuments(query),
    ]);
    return buildPaginatedResult(items, total, page, limit);
  }

  async findByFloor(floorId: string): Promise<IFlatDocument[]> {
    return Flat.find({ floorId, isActive: true }).sort({ flatNo: 1 });
  }

  async findById(id: string): Promise<IFlatDocument> {
    const flat = await Flat.findById(id).populate('towerId', 'name').populate('floorId', 'floorNumber');
    if (!flat || !flat.isActive) throw new NotFoundError('Flat');
    return flat;
  }

  async update(id: string, dto: Partial<CreateFlatDto>): Promise<IFlatDocument> {
    const flat = await Flat.findByIdAndUpdate(id, dto, { new: true });
    if (!flat) throw new NotFoundError('Flat');
    return flat;
  }

  async delete(id: string): Promise<void> {
    await Flat.findByIdAndUpdate(id, { isActive: false });
  }

  async getStats(societyId: string): Promise<Record<string, number>> {
    const stats = await Flat.aggregate([
      { $match: { societyId: new (require('mongoose').Types.ObjectId)(societyId), isActive: true } },
      { $group: { _id: '$occupancyStatus', count: { $sum: 1 } } },
    ]);
    return stats.reduce((acc, s) => ({ ...acc, [s._id]: s.count }), {});
  }
}

export const flatService = new FlatService();
