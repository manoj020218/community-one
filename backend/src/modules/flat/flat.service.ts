import { Flat, IFlatDocument } from './flat.model';
import { Floor } from '../floor/floor.model';
import { Resident } from '../resident/resident.model';
import { Vehicle } from '../vehicle/vehicle.model';
import { Pet } from '../pet/pet.model';
import { Lease } from '../lease/lease.model';
import { NotFoundError, ConflictError } from '../../common/errors/AppError';
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
  towerCode?: string;
  flatsPerFloor: number;
  flatType?: string;
  startUnit?: number;
}

export class FlatService {
  async create(dto: CreateFlatDto, createdBy: string): Promise<IFlatDocument> {
    return Flat.create({ ...dto, createdBy });
  }

  async generateFlats(dto: GenerateFlatsDto, createdBy: string): Promise<IFlatDocument[]> {
    const floor = await Floor.findById(dto.floorId);
    if (!floor) throw new NotFoundError('Floor');

    // Prefer the floor's own prefix (set at floor-generation time, e.g. "G", "B1", "1", "2")
    // so flat numbers follow the real Indian convention (G01, 101, 201...). Fall back to the
    // legacy tower-code + floor-number format for floors created before this field existed.
    const prefix = floor.flatNumberPrefix || `${dto.towerCode || ''}-${floor.floorNumber}`;

    const flats = [];
    const startUnit = dto.startUnit || 1;
    for (let i = 0; i < dto.flatsPerFloor; i++) {
      const unit = String(startUnit + i).padStart(2, '0');
      const flatNo = `${prefix}${unit}`;
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
    const flat = await Flat.findById(id);
    if (!flat || !flat.isActive) throw new NotFoundError('Flat');

    const [residentCount, vehicleCount, petCount, leaseCount] = await Promise.all([
      Resident.countDocuments({ flatId: id, isActive: true }),
      Vehicle.countDocuments({ flatId: id, isActive: true }),
      Pet.countDocuments({ flatId: id, isActive: true }),
      Lease.countDocuments({ flatId: id, isActive: true, status: 'ACTIVE' }),
    ]);
    const blockers: string[] = [];
    if (residentCount) blockers.push(`${residentCount} resident(s)`);
    if (vehicleCount) blockers.push(`${vehicleCount} vehicle(s)`);
    if (petCount) blockers.push(`${petCount} pet(s)`);
    if (leaseCount) blockers.push(`${leaseCount} active lease(s)`);
    if (blockers.length) {
      throw new ConflictError(`Cannot delete flat "${flat.flatNo}" — it still has ${blockers.join(', ')}. Remove or reassign them first.`);
    }

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
