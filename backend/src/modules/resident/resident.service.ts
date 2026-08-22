import { Types } from 'mongoose';
import { Resident, IResidentDocument } from './resident.model';
import { Flat } from '../flat/flat.model';
import { NotFoundError } from '../../common/errors/AppError';
import { buildPaginatedResult } from '../../common/utils/response';
import { PaginatedResult } from '../../common/types';
import { demandPublishService } from '../mcr/demandPublish.service';
import { moduleRegistryService } from '../moduleRegistry/moduleRegistry.service';
import { MODULE_CODES } from '../../config/constants';

// A newly-occupied flat may have demands sitting held (billingHold) from while it was
// Vacant/Builder-Unsold — release them now that someone actually lives there. Best-effort: MCR
// may not even be enabled for this society, and this should never block adding a resident.
async function releaseHeldDemandsIfOccupied(societyId: string, flatId: string, actorUserId: string): Promise<void> {
  try {
    if (!(await moduleRegistryService.isModuleEnabled(societyId, MODULE_CODES.MCR))) return;
    await demandPublishService.releaseHeldDemandsForFlat(societyId, flatId, actorUserId);
  } catch {
    // best-effort — never block resident creation/reassignment on this
  }
}

export type ResidentSortField = 'flatNo' | 'name' | 'memberType' | 'kycStatus';

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
  guardianMobile?: string;
  moveInDate?: string;
}

export interface MarkKycDto {
  physicalLocation: string;
  notes?: string;
}

export class ResidentService {
  async create(dto: CreateResidentDto, createdBy: string): Promise<IResidentDocument> {
    const resident = await Resident.create({ ...dto, createdBy });

    // Keep Flat.occupancyStatus accurate automatically — a manually-maintained field is easy
    // to forget, and a stale "Vacant"/"Builder Unsold" flat both hides that someone lives
    // there (Flats page) and could leave it under-billed depending on the society's vacant/
    // unsold billing policy. Only flip from those two — LOCKED/UNDER_RENOVATION are explicit
    // admin calls that adding a resident shouldn't override, and a flat already OWNER_/
    // TENANT_OCCUPIED shouldn't flip type just because a second resident (e.g. a family
    // member) joined.
    const occupiedStatus = dto.memberType === 'OWNER' ? 'OWNER_OCCUPIED' : 'TENANT_OCCUPIED';
    const previousFlat = await Flat.findOneAndUpdate(
      { _id: dto.flatId, occupancyStatus: { $in: ['VACANT', 'BUILDER_UNSOLD'] } },
      { occupancyStatus: occupiedStatus }
    );
    if (previousFlat) {
      await releaseHeldDemandsIfOccupied(dto.societyId, dto.flatId, createdBy);
    }

    return resident;
  }

  async findBySociety(
    societyId: string,
    page: number,
    limit: number,
    search?: string,
    sortBy: ResidentSortField = 'flatNo',
    sortDir: 1 | -1 = 1,
    towerId?: string
  ): Promise<PaginatedResult<IResidentDocument>> {
    const skip = (page - 1) * limit;
    const match: Record<string, unknown> = { societyId: new Types.ObjectId(societyId), isActive: true };
    if (towerId) {
      const towerFlats = await Flat.find({ towerId }).select('_id');
      match.flatId = { $in: towerFlats.map((f) => f._id) };
    }
    if (search) {
      // flatNo lives on Flat, not Resident — resolve matching flats first (scoped to this
      // society) so "G01" or a tower name finds the right residents without restructuring
      // the aggregation below into a search-after-join.
      const matchingFlats = await Flat.find({ societyId, flatNo: { $regex: search, $options: 'i' } }).select('_id');
      match.$or = [
        { name: { $regex: search, $options: 'i' } },
        { mobile: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { memberType: { $regex: search, $options: 'i' } },
        ...(matchingFlats.length ? [{ flatId: { $in: matchingFlats.map((f) => f._id) } }] : []),
      ];
    }

    if (sortBy !== 'flatNo') {
      const [items, total] = await Promise.all([
        Resident.find(match)
          .populate({ path: 'flatId', select: 'flatNo towerId floorId', populate: { path: 'towerId', select: 'name' } })
          .populate('kycVerifiedBy', 'name')
          .sort({ [sortBy]: sortDir })
          .skip(skip)
          .limit(limit),
        Resident.countDocuments(match),
      ]);
      return buildPaginatedResult(items, total, page, limit);
    }

    // Sorting by flatNo as a plain string would put letter-prefixed flats (Ground floor
    // "G01") after every numeric flat — same fix as the Flats page: join the real floor to
    // sort by physical building order (tower, then floorNumber, then flat) instead.
    const pipeline: any[] = [
      { $match: match },
      { $lookup: { from: 'flats', localField: 'flatId', foreignField: '_id', as: 'flat' } },
      { $unwind: { path: '$flat', preserveNullAndEmptyArrays: true } },
      { $lookup: { from: 'floors', localField: 'flat.floorId', foreignField: '_id', as: 'floor' } },
      { $unwind: { path: '$floor', preserveNullAndEmptyArrays: true } },
      { $lookup: { from: 'towers', localField: 'flat.towerId', foreignField: '_id', as: 'tower' } },
      { $unwind: { path: '$tower', preserveNullAndEmptyArrays: true } },
      { $lookup: { from: 'users', localField: 'kycVerifiedBy', foreignField: '_id', as: 'kycVerifier' } },
      { $unwind: { path: '$kycVerifier', preserveNullAndEmptyArrays: true } },
      { $sort: { 'tower.name': sortDir, 'floor.floorNumber': sortDir, 'flat.flatNo': sortDir } },
    ];

    const [items, totalResult] = await Promise.all([
      Resident.aggregate([...pipeline, { $skip: skip }, { $limit: limit }]),
      Resident.aggregate([{ $match: match }, { $count: 'total' }]),
    ]);

    const shaped = items.map((r: any) => ({
      ...r,
      flatId: r.flat
        ? { _id: r.flat._id, flatNo: r.flat.flatNo, floorId: r.flat.floorId, towerId: r.tower ? { _id: r.tower._id, name: r.tower.name } : undefined }
        : r.flatId,
      kycVerifiedBy: r.kycVerifier ? { _id: r.kycVerifier._id, name: r.kycVerifier.name } : r.kycVerifiedBy,
    }));

    return buildPaginatedResult(shaped, totalResult[0]?.total || 0, page, limit);
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

  async update(id: string, dto: Partial<CreateResidentDto>, actorUserId?: string): Promise<IResidentDocument> {
    const before = await Resident.findById(id);
    if (!before) throw new NotFoundError('Resident');

    const resident = await Resident.findByIdAndUpdate(id, dto, { new: true });
    if (!resident) throw new NotFoundError('Resident');

    // Reassigning to a different flat: same occupancy sync as create()/disable() — occupy the
    // new flat, and revert the old one to Vacant if this was its last resident.
    const oldFlatId = before.flatId.toString();
    const newFlatId = dto.flatId ? dto.flatId.toString() : oldFlatId;
    if (dto.flatId && newFlatId !== oldFlatId) {
      const occupiedStatus = resident.memberType === 'OWNER' ? 'OWNER_OCCUPIED' : 'TENANT_OCCUPIED';
      const previousFlat = await Flat.findOneAndUpdate(
        { _id: newFlatId, occupancyStatus: { $in: ['VACANT', 'BUILDER_UNSOLD'] } },
        { occupancyStatus: occupiedStatus }
      );
      if (previousFlat && actorUserId) {
        await releaseHeldDemandsIfOccupied(resident.societyId.toString(), newFlatId, actorUserId);
      }

      const remaining = await Resident.countDocuments({ flatId: oldFlatId, isActive: true });
      if (remaining === 0) {
        await Flat.updateOne(
          { _id: oldFlatId, occupancyStatus: { $in: ['OWNER_OCCUPIED', 'TENANT_OCCUPIED'] } },
          { occupancyStatus: 'VACANT' }
        );
      }
    }

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
    const resident = await Resident.findByIdAndUpdate(id, { isActive: false, status: 'INACTIVE' });
    if (!resident) return;

    // Mirror of the auto-occupy in create(): only revert an auto-set OWNER_/TENANT_OCCUPIED
    // back to VACANT, and only once no active resident remains — LOCKED/UNDER_RENOVATION stay
    // untouched since those were an explicit admin call, not something this should undo.
    const remaining = await Resident.countDocuments({ flatId: resident.flatId, isActive: true });
    if (remaining === 0) {
      await Flat.updateOne(
        { _id: resident.flatId, occupancyStatus: { $in: ['OWNER_OCCUPIED', 'TENANT_OCCUPIED'] } },
        { occupancyStatus: 'VACANT' }
      );
    }
  }

  async getCountBySociety(societyId: string): Promise<number> {
    return Resident.countDocuments({ societyId, isActive: true });
  }
}

export const residentService = new ResidentService();
