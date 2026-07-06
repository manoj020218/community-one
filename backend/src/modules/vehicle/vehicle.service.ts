import { Vehicle, IVehicleDocument } from './vehicle.model';
import { NotFoundError, ConflictError } from '../../common/errors/AppError';
import { buildPaginatedResult } from '../../common/utils/response';
import { PaginatedResult } from '../../common/types';

export interface CreateVehicleDto {
  societyId: string;
  flatId: string;
  memberId?: string;
  vehicleNo: string;
  vehicleType: string;
  brand?: string;
  model?: string;
  color?: string;
  parkingSlot?: string;
  uhfTagId?: string;
  rfidCardId?: string;
  stickerNo?: string;
}

export class VehicleService {
  async create(dto: CreateVehicleDto, createdBy: string): Promise<IVehicleDocument> {
    const existing = await Vehicle.findOne({ societyId: dto.societyId, vehicleNo: dto.vehicleNo.toUpperCase() });
    if (existing) throw new ConflictError(`Vehicle ${dto.vehicleNo} already registered`);
    return Vehicle.create({ ...dto, vehicleNo: dto.vehicleNo.toUpperCase(), createdBy });
  }

  async findBySociety(societyId: string, page: number, limit: number, search?: string): Promise<PaginatedResult<IVehicleDocument>> {
    const query: any = { societyId, isActive: true };
    if (search) query.$or = [
      { vehicleNo: { $regex: search, $options: 'i' } },
      { brand: { $regex: search, $options: 'i' } },
    ];
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      Vehicle.find(query).populate('flatId', 'flatNo').populate('memberId', 'name').sort({ vehicleNo: 1 }).skip(skip).limit(limit),
      Vehicle.countDocuments(query),
    ]);
    return buildPaginatedResult(items, total, page, limit);
  }

  async findByFlat(flatId: string): Promise<IVehicleDocument[]> {
    return Vehicle.find({ flatId, isActive: true }).sort({ vehicleNo: 1 });
  }

  async findById(id: string): Promise<IVehicleDocument> {
    const vehicle = await Vehicle.findById(id);
    if (!vehicle || !vehicle.isActive) throw new NotFoundError('Vehicle');
    return vehicle;
  }

  async update(id: string, dto: Partial<CreateVehicleDto>): Promise<IVehicleDocument> {
    const vehicle = await Vehicle.findByIdAndUpdate(id, dto, { new: true });
    if (!vehicle) throw new NotFoundError('Vehicle');
    return vehicle;
  }

  async disable(id: string): Promise<void> {
    await Vehicle.findByIdAndUpdate(id, { isActive: false, status: 'INACTIVE' });
  }

  async getCountBySociety(societyId: string): Promise<number> {
    return Vehicle.countDocuments({ societyId, isActive: true });
  }
}

export const vehicleService = new VehicleService();
