import { Floor, IFloorDocument } from './floor.model';
import { NotFoundError } from '../../common/errors/AppError';

export interface CreateFloorDto {
  societyId: string;
  towerId: string;
  floorNumber: number;
  floorName?: string;
  totalFlats?: number;
}

export interface GenerateFloorsDto {
  societyId: string;
  towerId: string;
  count: number;
  startFrom?: number;
}

export class FloorService {
  async create(dto: CreateFloorDto, createdBy: string): Promise<IFloorDocument> {
    const floorName = dto.floorName || `Floor ${dto.floorNumber}`;
    return Floor.create({ ...dto, floorName, createdBy });
  }

  async generateFloors(dto: GenerateFloorsDto, createdBy: string): Promise<IFloorDocument[]> {
    const startFrom = dto.startFrom ?? 1;
    const floors = [];
    for (let i = 0; i < dto.count; i++) {
      const floorNumber = startFrom + i;
      const exists = await Floor.findOne({ towerId: dto.towerId, floorNumber });
      if (!exists) {
        floors.push({
          societyId: dto.societyId,
          towerId: dto.towerId,
          floorNumber,
          floorName: `Floor ${floorNumber}`,
          createdBy,
        });
      }
    }
    return Floor.insertMany(floors) as any;
  }

  async findByTower(towerId: string): Promise<IFloorDocument[]> {
    return Floor.find({ towerId, isActive: true }).sort({ floorNumber: 1 });
  }

  async findBySociety(societyId: string): Promise<IFloorDocument[]> {
    return Floor.find({ societyId, isActive: true }).sort({ floorNumber: 1 });
  }

  async findById(id: string): Promise<IFloorDocument> {
    const floor = await Floor.findById(id);
    if (!floor || !floor.isActive) throw new NotFoundError('Floor');
    return floor;
  }

  async update(id: string, dto: Partial<CreateFloorDto>): Promise<IFloorDocument> {
    const floor = await Floor.findByIdAndUpdate(id, dto, { new: true });
    if (!floor) throw new NotFoundError('Floor');
    return floor;
  }

  async delete(id: string): Promise<void> {
    await Floor.findByIdAndUpdate(id, { isActive: false });
  }
}

export const floorService = new FloorService();
