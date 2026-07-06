import { Tower, ITowerDocument } from './tower.model';
import { CreateTowerDto, UpdateTowerDto, GenerateTowersDto } from './tower.types';
import { NotFoundError, ConflictError } from '../../common/errors/AppError';

export class TowerService {
  async create(dto: CreateTowerDto, createdBy: string): Promise<ITowerDocument> {
    const code = dto.code || dto.name.toUpperCase().replace(/\s+/g, '-');
    const existing = await Tower.findOne({ societyId: dto.societyId, code, isActive: true });
    if (existing) throw new ConflictError(`Tower ${code} already exists in this society`);

    return Tower.create({ ...dto, code, createdBy });
  }

  async generateTowers(dto: GenerateTowersDto, createdBy: string): Promise<ITowerDocument[]> {
    const prefix = dto.prefix || 'Tower';
    const labels = ['A','B','C','D','E','F','G','H','I','J','K','L'];
    const towers = [];

    for (let i = 0; i < dto.count; i++) {
      const label = labels[i] || String(i + 1);
      const name = `${prefix} ${label}`;
      const code = name.toUpperCase().replace(/\s+/g, '-');
      const existing = await Tower.findOne({ societyId: dto.societyId, code });
      if (!existing) {
        towers.push({
          societyId: dto.societyId,
          name,
          code,
          type: dto.type || 'TOWER',
          numberOfFloors: dto.numberOfFloors || 10,
          hasLift: dto.hasLift ?? false,
          createdBy,
        });
      }
    }

    return Tower.insertMany(towers) as any;
  }

  async findBySociety(societyId: string): Promise<ITowerDocument[]> {
    return Tower.find({ societyId, isActive: true }).sort({ name: 1 });
  }

  async findById(id: string): Promise<ITowerDocument> {
    const tower = await Tower.findById(id);
    if (!tower || !tower.isActive) throw new NotFoundError('Tower');
    return tower;
  }

  async update(id: string, dto: UpdateTowerDto): Promise<ITowerDocument> {
    const tower = await Tower.findByIdAndUpdate(id, dto, { new: true });
    if (!tower) throw new NotFoundError('Tower');
    return tower;
  }

  async delete(id: string): Promise<void> {
    await Tower.findByIdAndUpdate(id, { isActive: false });
  }
}

export const towerService = new TowerService();
