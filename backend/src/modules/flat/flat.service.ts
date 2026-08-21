import { Types } from 'mongoose';
import { Flat, IFlatDocument } from './flat.model';
import { Floor } from '../floor/floor.model';
import { Resident } from '../resident/resident.model';
import { Vehicle } from '../vehicle/vehicle.model';
import { Pet } from '../pet/pet.model';
import { Lease } from '../lease/lease.model';
import { MaintenanceDemand } from '../mcr/demand.model';
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
      // Scoped to this tower, not the whole society — two towers with the same floor
      // structure legitimately produce the same flat numbers (see Flat's index comment).
      const exists = await Flat.findOne({ towerId: dto.towerId, flatNo });
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

  async findBySociety(societyId: string, page: number, limit: number, towerId?: string): Promise<PaginatedResult<IFlatDocument>> {
    const skip = (page - 1) * limit;
    const match: Record<string, any> = { societyId: new Types.ObjectId(societyId), isActive: true };
    if (towerId) match.towerId = new Types.ObjectId(towerId);

    // Sorting by flatNo alone is a plain string sort, so letter-prefixed flats (Ground
    // floor "G01", basements "B101") sort AFTER every plain numeric flat ("101".."999") —
    // with pagination that pushes Ground floor off page 1 entirely, even though it's
    // physically the first floor. Look up each flat's real floor/tower and sort by that
    // instead, so the list reads in actual building order.
    const pipeline: any[] = [
      { $match: match },
      { $lookup: { from: 'floors', localField: 'floorId', foreignField: '_id', as: 'floor' } },
      { $unwind: { path: '$floor', preserveNullAndEmptyArrays: true } },
      { $lookup: { from: 'towers', localField: 'towerId', foreignField: '_id', as: 'tower' } },
      { $unwind: { path: '$tower', preserveNullAndEmptyArrays: true } },
      { $sort: { 'tower.name': 1, 'floor.floorNumber': 1, flatNo: 1 } },
    ];

    const [items, totalResult] = await Promise.all([
      Flat.aggregate([...pipeline, { $skip: skip }, { $limit: limit }]),
      Flat.aggregate([{ $match: match }, { $count: 'total' }]),
    ]);

    const shaped = items.map((f: any) => ({
      ...f,
      towerId: f.tower ? { _id: f.tower._id, name: f.tower.name, code: f.tower.code } : f.towerId,
      floorId: f.floor ? { _id: f.floor._id, floorNumber: f.floor.floorNumber, floorName: f.floor.floorName } : f.floorId,
    }));

    return buildPaginatedResult(shaped, totalResult[0]?.total || 0, page, limit);
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

    const [residentCount, vehicleCount, petCount, leaseCount, demandCount] = await Promise.all([
      Resident.countDocuments({ flatId: id, isActive: true }),
      Vehicle.countDocuments({ flatId: id, isActive: true }),
      Pet.countDocuments({ flatId: id, isActive: true }),
      Lease.countDocuments({ flatId: id, isActive: true, status: 'ACTIVE' }),
      // PAID/CANCELLED are resolved and don't block — DRAFT/PUBLISHED/PARTIALLY_PAID/OVERDUE
      // still owe money against this flat, so deleting it would orphan a live bill (found via
      // a real case: a demand for a since-deleted flat kept showing OVERDUE with no way to
      // trace it back to a real unit).
      MaintenanceDemand.countDocuments({ flatId: id, status: { $nin: ['PAID', 'CANCELLED'] } }),
    ]);
    const blockers: string[] = [];
    if (residentCount) blockers.push(`${residentCount} resident(s)`);
    if (vehicleCount) blockers.push(`${vehicleCount} vehicle(s)`);
    if (petCount) blockers.push(`${petCount} pet(s)`);
    if (leaseCount) blockers.push(`${leaseCount} active lease(s)`);
    if (demandCount) blockers.push(`${demandCount} unpaid maintenance demand(s)`);
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

  async getStatsByTower(societyId: string): Promise<Array<{ towerId: string; towerName: string; total: number; occupied: number; vacant: number; other: number }>> {
    const rows = await Flat.aggregate([
      { $match: { societyId: new Types.ObjectId(societyId), isActive: true } },
      { $group: { _id: { towerId: '$towerId', occupancyStatus: '$occupancyStatus' }, count: { $sum: 1 } } },
      { $group: { _id: '$_id.towerId', statuses: { $push: { status: '$_id.occupancyStatus', count: '$count' } }, total: { $sum: '$count' } } },
      { $lookup: { from: 'towers', localField: '_id', foreignField: '_id', as: 'tower' } },
      { $unwind: '$tower' },
      { $sort: { 'tower.name': 1 } },
    ]);
    return rows.map((r) => {
      const occupied = r.statuses
        .filter((s: any) => s.status === 'OWNER_OCCUPIED' || s.status === 'TENANT_OCCUPIED')
        .reduce((a: number, s: any) => a + s.count, 0);
      const vacant = r.statuses.find((s: any) => s.status === 'VACANT')?.count || 0;
      return { towerId: r._id.toString(), towerName: r.tower.name, total: r.total, occupied, vacant, other: r.total - occupied - vacant };
    });
  }
}

export const flatService = new FlatService();
