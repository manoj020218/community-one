import { NotFoundError, ValidationError } from '../../common/errors/AppError';
import { User } from '../user/user.model';
import { Resident } from '../resident/resident.model';
import { ParentWardLink, IParentWardLinkDocument } from './parentWardLink.model';

export interface ParentWardLinkDto {
  societyId: string;
  userId: string;
  residentIds: string[];
}

export class ParentWardLinkService {
  async create(dto: ParentWardLinkDto, createdBy: string): Promise<IParentWardLinkDocument> {
    await this.assertParentActor(dto.societyId, dto.userId);
    await this.assertResidentOwnership(dto.societyId, dto.residentIds);
    return ParentWardLink.create({ ...dto, createdBy });
  }

  async findBySociety(societyId: string): Promise<IParentWardLinkDocument[]> {
    return ParentWardLink.find({ societyId, isActive: true })
      .populate('userId', 'name email mobile roleCode')
      .populate('residentIds', 'name mobile flatId');
  }

  async update(id: string, dto: Partial<ParentWardLinkDto>): Promise<IParentWardLinkDocument> {
    const link = await ParentWardLink.findById(id);
    if (!link || !link.isActive) throw new NotFoundError('Parent-ward link');
    const societyId = link.societyId.toString();
    if (dto.userId) await this.assertParentActor(societyId, dto.userId);
    if (dto.residentIds) await this.assertResidentOwnership(societyId, dto.residentIds);
    const updated = await ParentWardLink.findByIdAndUpdate(id, dto, { new: true, runValidators: true })
      .populate('userId', 'name email mobile roleCode')
      .populate('residentIds', 'name mobile flatId');
    if (!updated) throw new NotFoundError('Parent-ward link');
    return updated;
  }

  async disable(id: string): Promise<void> {
    await ParentWardLink.findByIdAndUpdate(id, { isActive: false });
  }

  /** Resident _ids a given Parent user is allowed to view — empty array if they have no active link. */
  async getWardResidentIdsForUser(societyId: string, userId: string): Promise<string[]> {
    const links = await ParentWardLink.find({ societyId, userId, isActive: true });
    return [...new Set(links.flatMap((link) => link.residentIds.map((id: any) => String(id))))];
  }

  /** Reverse lookup: Parent user _ids linked to a given resident — used to route access-event push alerts. */
  async getParentUserIdsForResident(societyId: string, residentId: string): Promise<string[]> {
    const links = await ParentWardLink.find({ societyId, residentIds: residentId, isActive: true });
    return [...new Set(links.map((link) => String(link.userId)))];
  }

  async myWards(societyId: string, userId: string) {
    const links = await ParentWardLink.find({ societyId, userId, isActive: true }).populate('residentIds', 'name mobile flatId photoUrl');
    return [...new Map(links.flatMap((link) => link.residentIds as any[]).map((resident: any) => [resident._id.toString(), resident])).values()];
  }

  private async assertParentActor(societyId: string, userId: string): Promise<void> {
    const user = await User.findOne({ _id: userId, societyId, isActive: true });
    if (!user) throw new ValidationError('User does not belong to this society');
    if (user.roleCode !== 'PARENT') throw new ValidationError('Linked user must have the PARENT role');
  }

  private async assertResidentOwnership(societyId: string, residentIds: string[]): Promise<void> {
    const residents = await Resident.find({ _id: { $in: residentIds }, societyId, isActive: true });
    if (residents.length !== residentIds.length) throw new ValidationError('One or more residents do not belong to this society');
  }
}

export const parentWardLinkService = new ParentWardLinkService();
