import { Floor, IFloorDocument, FloorType } from './floor.model';
import { NotFoundError } from '../../common/errors/AppError';

export interface CreateFloorDto {
  societyId: string;
  towerId: string;
  floorNumber: number;
  floorName?: string;
  floorType?: FloorType;
  flatNumberPrefix?: string;
  totalFlats?: number;
}

export interface GenerateFloorsDto {
  societyId: string;
  towerId: string;
  // Typical/residential floors only — floorNumber 1..count (or startFrom..startFrom+count-1).
  count: number;
  startFrom?: number;
  // Ground floor and basements are asked for separately so a plain "10 floors" answer
  // never silently swallows them — they default to off/0, admin opts in explicitly.
  hasGroundFloor?: boolean;
  groundFloorFlats?: number; // 0 = lobby/reception only, no residential flats generated
  basementCount?: number;
  basementPrefix?: string; // default 'B' -> B1, B2 ... use 'P' for parking-labelled basements
}

export class FloorService {
  async create(dto: CreateFloorDto, createdBy: string): Promise<IFloorDocument> {
    const floorName = dto.floorName || `Floor ${dto.floorNumber}`;
    return Floor.create({ ...dto, floorName, createdBy });
  }

  async generateFloors(dto: GenerateFloorsDto, createdBy: string): Promise<IFloorDocument[]> {
    const startFrom = dto.startFrom ?? 1;
    const basementPrefix = dto.basementPrefix || 'B';
    const floors: Partial<IFloorDocument>[] = [];

    if (dto.hasGroundFloor) {
      floors.push({
        societyId: dto.societyId as any,
        towerId: dto.towerId as any,
        floorNumber: 0,
        floorName: 'Ground Floor',
        floorType: 'GROUND',
        flatNumberPrefix: 'G',
        totalFlats: dto.groundFloorFlats ?? 0,
        createdBy: createdBy as any,
      });
    }

    for (let b = 1; b <= (dto.basementCount ?? 0); b++) {
      floors.push({
        societyId: dto.societyId as any,
        towerId: dto.towerId as any,
        floorNumber: -b,
        floorName: `Basement ${b}`,
        floorType: 'BASEMENT',
        flatNumberPrefix: `${basementPrefix}${b}`,
        totalFlats: 0,
        createdBy: createdBy as any,
      });
    }

    for (let i = 0; i < dto.count; i++) {
      const floorNumber = startFrom + i;
      floors.push({
        societyId: dto.societyId as any,
        towerId: dto.towerId as any,
        floorNumber,
        floorName: `Floor ${floorNumber}`,
        floorType: 'TYPICAL',
        flatNumberPrefix: String(floorNumber),
        createdBy: createdBy as any,
      });
    }

    const existing = await Floor.find({ towerId: dto.towerId }, { floorNumber: 1 });
    const existingNumbers = new Set(existing.map((f) => f.floorNumber));
    const toCreate = floors.filter((f) => !existingNumbers.has(f.floorNumber!));
    if (toCreate.length === 0) return [];
    return Floor.insertMany(toCreate) as any;
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
