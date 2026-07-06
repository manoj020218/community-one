import { AuditLog, IAuditLogDocument } from './audit.model';
import { CreateAuditLogDto, AuditLogFilter } from './audit.types';
import { buildPaginatedResult } from '../../common/utils/response';
import { PaginatedResult } from '../../common/types';

export class AuditService {
  async log(dto: CreateAuditLogDto): Promise<void> {
    try {
      await AuditLog.create(dto);
    } catch {
      // Audit log failures should never crash the app
    }
  }

  async findBySociety(
    societyId: string,
    filter: AuditLogFilter,
    page: number,
    limit: number
  ): Promise<PaginatedResult<IAuditLogDocument>> {
    const query: Record<string, any> = { societyId };

    if (filter.actorUserId) query.actorUserId = filter.actorUserId;
    if (filter.moduleCode) query.moduleCode = filter.moduleCode;
    if (filter.action) query.action = filter.action;
    if (filter.entityType) query.entityType = filter.entityType;
    if (filter.startDate || filter.endDate) {
      query.createdAt = {};
      if (filter.startDate) query.createdAt.$gte = filter.startDate;
      if (filter.endDate) query.createdAt.$lte = filter.endDate;
    }

    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      AuditLog.find(query)
        .populate('actorUserId', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      AuditLog.countDocuments(query),
    ]);

    return buildPaginatedResult(items, total, page, limit);
  }

  async findAll(
    filter: AuditLogFilter,
    page: number,
    limit: number
  ): Promise<PaginatedResult<IAuditLogDocument>> {
    const query: Record<string, any> = {};
    if (filter.societyId) query.societyId = filter.societyId;
    if (filter.moduleCode) query.moduleCode = filter.moduleCode;
    if (filter.action) query.action = filter.action;

    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      AuditLog.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
      AuditLog.countDocuments(query),
    ]);

    return buildPaginatedResult(items, total, page, limit);
  }
}

export const auditService = new AuditService();
