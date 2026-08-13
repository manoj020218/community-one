import { PaginatedResult } from '../../common/types';
import { ConflictError, NotFoundError, ValidationError } from '../../common/errors/AppError';
import { buildPaginatedResult } from '../../common/utils/response';
import { Flat } from '../flat/flat.model';
import { Resident } from '../resident/resident.model';
import { CreateLeaseDto, RenewLeaseDto, TerminateLeaseDto, UpdateLeaseDto } from './lease.types';
import { ILeaseDocument, Lease } from './lease.model';

const LEASE_POPULATE: Array<{ path: string; select: string }> = [
  { path: 'flatId', select: 'flatNo' },
  { path: 'residentId', select: 'name mobile' },
];

function todayUtcStart(): Date {
  const date = new Date();
  date.setUTCHours(0, 0, 0, 0);
  return date;
}

function pickId(value: unknown): string {
  const id = (value as { _id?: unknown })?._id || value;
  if (!id) throw new NotFoundError('Lease relation');
  return id.toString();
}

export class LeaseService {
  async create(dto: CreateLeaseDto, createdBy: string): Promise<ILeaseDocument> {
    await this.syncExpiredLeases({ flatId: dto.flatId });
    await this.assertCreateRelations(dto);
    await this.assertNoActiveLease(dto.flatId);
    const lease = await Lease.create({ ...dto, depositAmount: dto.depositAmount ?? 0, noticePeriodDays: dto.noticePeriodDays ?? 30, createdBy });
    await Flat.findByIdAndUpdate(dto.flatId, { occupancyStatus: 'TENANT_OCCUPIED' });
    return this.findById(lease._id!.toString());
  }

  async listBySociety(societyId: string, page: number, limit: number, status?: string): Promise<PaginatedResult<ILeaseDocument>> {
    await this.syncExpiredLeases({ societyId });
    const query: Record<string, unknown> = { societyId, isActive: true };
    if (status) query.status = status;
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      Lease.find(query).populate(LEASE_POPULATE).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Lease.countDocuments(query),
    ]);
    return buildPaginatedResult(items, total, page, limit);
  }

  async findById(id: string): Promise<ILeaseDocument> {
    await this.syncExpiredLeases({ _id: id });
    const lease = await Lease.findOne({ _id: id, isActive: true }).populate(LEASE_POPULATE);
    if (!lease) throw new NotFoundError('Lease');
    return lease;
  }

  async update(id: string, dto: UpdateLeaseDto): Promise<ILeaseDocument> {
    const current = await this.findById(id);
    const nextStartDate = dto.startDate ?? current.startDate;
    const nextEndDate = dto.endDate ?? current.endDate;
    if (nextEndDate < nextStartDate) throw new ValidationError('endDate must be on or after startDate');

    const nextStatus = current.status === 'TERMINATED'
      ? current.status
      : nextEndDate < todayUtcStart() ? 'EXPIRED' : 'ACTIVE';

    const lease = await Lease.findByIdAndUpdate(id, { ...dto, status: nextStatus }, { new: true, runValidators: true }).populate(LEASE_POPULATE);
    if (!lease) throw new NotFoundError('Lease');
    return lease;
  }

  async renew(id: string, dto: RenewLeaseDto): Promise<ILeaseDocument> {
    const current = await this.findById(id);
    if (current.status === 'TERMINATED') throw new ConflictError('Terminated lease cannot be renewed');
    if (dto.newEndDate <= current.endDate) throw new ValidationError('newEndDate must be after the current endDate');

    const lease = await Lease.findByIdAndUpdate(
      id,
      { endDate: dto.newEndDate, rentAmount: dto.newRentAmount ?? current.rentAmount, status: 'ACTIVE' },
      { new: true, runValidators: true }
    ).populate(LEASE_POPULATE);

    if (!lease) throw new NotFoundError('Lease');
    await Flat.findByIdAndUpdate(pickId(lease.flatId), { occupancyStatus: 'TENANT_OCCUPIED' });
    return lease;
  }

  async terminate(id: string, dto: TerminateLeaseDto): Promise<ILeaseDocument> {
    const current = await this.findById(id);
    if (current.status === 'TERMINATED') throw new ConflictError('Lease is already terminated');

    const lease = await Lease.findByIdAndUpdate(
      id,
      {
        status: 'TERMINATED',
        terminationDate: dto.terminationDate,
        terminationReason: dto.reason,
        depositRefundAmount: dto.depositRefundAmount,
        depositRefundedAt: dto.depositRefundAmount === undefined ? undefined : new Date(),
      },
      { new: true, runValidators: true }
    ).populate(LEASE_POPULATE);

    if (!lease) throw new NotFoundError('Lease');
    const flatId = pickId(current.flatId);
    await this.syncExpiredLeases({ flatId });
    const activeCount = await Lease.countDocuments({ flatId, isActive: true, status: 'ACTIVE' });
    if (activeCount === 0) await Flat.findByIdAndUpdate(flatId, { occupancyStatus: 'VACANT' });
    return lease;
  }

  private async assertCreateRelations(dto: CreateLeaseDto): Promise<void> {
    const [flat, resident] = await Promise.all([
      Flat.findOne({ _id: dto.flatId, societyId: dto.societyId, isActive: true }),
      Resident.findOne({ _id: dto.residentId, societyId: dto.societyId, isActive: true }),
    ]);

    if (!flat) throw new NotFoundError('Flat');
    if (!resident) throw new NotFoundError('Resident');
    if (resident.memberType !== 'TENANT') throw new ValidationError('residentId must belong to a TENANT resident');
    if (resident.flatId.toString() !== dto.flatId) throw new ValidationError('Resident does not belong to the selected flat');
  }

  private async assertNoActiveLease(flatId: string): Promise<void> {
    const activeLease = await Lease.findOne({ flatId, isActive: true, status: 'ACTIVE' });
    if (activeLease) throw new ConflictError('An active lease already exists for this flat');
  }

  private async syncExpiredLeases(filter: Record<string, unknown>): Promise<void> {
    await Lease.updateMany(
      { ...filter, isActive: true, status: 'ACTIVE', endDate: { $lt: todayUtcStart() } },
      { status: 'EXPIRED' }
    );
  }
}

export const leaseService = new LeaseService();
