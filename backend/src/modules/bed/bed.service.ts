import { ConflictError, NotFoundError, ValidationError } from '../../common/errors/AppError';
import { Flat } from '../flat/flat.model';
import { Resident } from '../resident/resident.model';
import { AssignBedDto, CreateBedDto, GenerateBedsDto, UpdateBedDto } from './bed.types';
import { Bed, IBedDocument } from './bed.model';

const BED_POPULATE: Array<{ path: string; select: string }> = [{ path: 'assignedResidentId', select: 'name mobile' }];

function pickId(value: unknown): string {
  const id = (value as { _id?: unknown })?._id || value;
  if (!id) throw new NotFoundError('Bed relation');
  return id.toString();
}

export class BedService {
  async create(dto: CreateBedDto, createdBy: string): Promise<IBedDocument> {
    await this.assertFlatExists(dto.societyId, dto.flatId);
    const exists = await Bed.findOne({ flatId: dto.flatId, bedNumber: dto.bedNumber });
    if (exists) throw new ConflictError(`Bed ${dto.bedNumber} already exists in this room`);
    const bed = await Bed.create({ ...dto, createdBy });
    return this.findById(bed._id!.toString());
  }

  async generate(dto: GenerateBedsDto, createdBy: string): Promise<IBedDocument[]> {
    await this.assertFlatExists(dto.societyId, dto.flatId);
    const existing = await Bed.find({ flatId: dto.flatId, isActive: true }).select('bedNumber');
    const existingNumbers = new Set(existing.map((b) => b.bedNumber));

    const toCreate = [];
    for (let i = 1; i <= dto.count; i++) {
      const bedNumber = String(i);
      if (!existingNumbers.has(bedNumber)) {
        toCreate.push({ societyId: dto.societyId, flatId: dto.flatId, bedNumber, createdBy });
      }
    }
    if (toCreate.length === 0) return [];
    return Bed.insertMany(toCreate) as unknown as IBedDocument[];
  }

  async listByFlat(flatId: string): Promise<IBedDocument[]> {
    return Bed.find({ flatId, isActive: true }).populate(BED_POPULATE).sort({ bedNumber: 1 });
  }

  async findById(id: string): Promise<IBedDocument> {
    const bed = await Bed.findOne({ _id: id, isActive: true }).populate(BED_POPULATE);
    if (!bed) throw new NotFoundError('Bed');
    return bed;
  }

  async update(id: string, dto: UpdateBedDto): Promise<IBedDocument> {
    const bed = await Bed.findOneAndUpdate({ _id: id, isActive: true }, dto, { new: true, runValidators: true }).populate(BED_POPULATE);
    if (!bed) throw new NotFoundError('Bed');
    return bed;
  }

  async assign(id: string, dto: AssignBedDto): Promise<IBedDocument> {
    const bed = await this.findById(id);
    const resident = await Resident.findOne({ _id: dto.residentId, isActive: true });
    if (!resident) throw new NotFoundError('Resident');
    if (resident.flatId.toString() !== pickId(bed.flatId)) {
      throw new ValidationError('Resident does not belong to the room this bed is in');
    }
    await this.assertResidentNotAlreadyAssigned(dto.residentId, id);

    const updated = await Bed.findByIdAndUpdate(id, { assignedResidentId: dto.residentId, status: 'OCCUPIED' }, { new: true, runValidators: true }).populate(BED_POPULATE);
    if (!updated) throw new NotFoundError('Bed');
    return updated;
  }

  async release(id: string): Promise<IBedDocument> {
    const updated = await Bed.findByIdAndUpdate(id, { $unset: { assignedResidentId: 1 }, status: 'VACANT' }, { new: true, runValidators: true }).populate(BED_POPULATE);
    if (!updated) throw new NotFoundError('Bed');
    return updated;
  }

  async disable(id: string): Promise<void> {
    await Bed.findByIdAndUpdate(id, { isActive: false });
  }

  private async assertFlatExists(societyId: string, flatId: string): Promise<void> {
    const flat = await Flat.findOne({ _id: flatId, societyId, isActive: true });
    if (!flat) throw new NotFoundError('Flat');
  }

  private async assertResidentNotAlreadyAssigned(residentId: string, excludeBedId: string): Promise<void> {
    const existing = await Bed.findOne({ assignedResidentId: residentId, isActive: true, _id: { $ne: excludeBedId } });
    if (existing) throw new ConflictError('This resident is already assigned to another bed');
  }
}

export const bedService = new BedService();
