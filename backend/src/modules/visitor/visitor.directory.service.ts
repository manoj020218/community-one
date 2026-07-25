import { PaginatedResult } from '../../common/types';
import { buildPaginatedResult } from '../../common/utils/response';
import { Flat } from '../flat/flat.model';
import { Gate } from '../gate/gate.model';
import { Tower } from '../tower/tower.model';
import { VisitorActorContext } from './visitor.access.service';
import { VISITOR_STATUSES } from './visitor.constants';
import { VisitorRequest } from './visitor.model';
import { visitorSettingsService } from './visitor.settings.service';

export class VisitorDirectoryService {
  async getTowers(context: VisitorActorContext) {
    const towerIds = await this.resolveTowerIds(context);
    const query: Record<string, unknown> = { societyId: context.societyId, isActive: true };
    if (towerIds?.length) query._id = { $in: towerIds };
    return Tower.find(query).sort({ name: 1 });
  }

  async getFlats(
    context: VisitorActorContext,
    towerId: string,
    page: number,
    limit: number,
    search?: string
  ): Promise<PaginatedResult<Record<string, unknown>>> {
    const settings = await visitorSettingsService.getSettings(context.societyId);
    const query: Record<string, any> = { societyId: context.societyId, towerId, isActive: true };
    if (context.flatId) query._id = context.flatId;
    if (search) query.flatNo = { $regex: search, $options: 'i' };
    const skip = (page - 1) * limit;
    const [flats, total] = await Promise.all([
      Flat.find(query).sort({ flatNo: 1 }).skip(skip).limit(limit).lean(),
      Flat.countDocuments(query),
    ]);

    const since = new Date(Date.now() - settings.guardStatusDisplaySeconds * 1000);
    const flatIds = flats.map((flat) => flat._id);
    const requests = await VisitorRequest.find({
      societyId: context.societyId,
      flatId: { $in: flatIds },
      $or: [
        { status: { $in: [VISITOR_STATUSES.PENDING_APPROVAL, VISITOR_STATUSES.APPROVED, VISITOR_STATUSES.ENTRY_CONFIRMED] } },
        { status: { $in: [VISITOR_STATUSES.REJECTED, VISITOR_STATUSES.EXPIRED, VISITOR_STATUSES.CANCELLED, VISITOR_STATUSES.EXIT_CONFIRMED] }, statusChangedAt: { $gte: since } },
      ],
    }).sort({ statusChangedAt: -1 }).lean();

    const requestMap = new Map<string, typeof requests[number]>();
    for (const request of requests) {
      const flatKey = request.flatId.toString();
      if (!requestMap.has(flatKey)) requestMap.set(flatKey, request);
    }

    return buildPaginatedResult(
      flats.map((flat) => ({
        ...flat,
        activeRequest: requestMap.get(flat._id.toString())
          ? {
              requestId: requestMap.get(flat._id.toString())!._id.toString(),
              status: requestMap.get(flat._id.toString())!.status,
              statusChangedAt: requestMap.get(flat._id.toString())!.statusChangedAt,
              gateId: requestMap.get(flat._id.toString())!.gateId,
            }
          : null,
      })),
      total,
      page,
      limit
    );
  }

  private async resolveTowerIds(context: VisitorActorContext): Promise<string[] | null> {
    if (context.canViewSociety || context.canOverride) return null;
    if (context.flatId) {
      const flat = await Flat.findById(context.flatId).select('towerId');
      return flat ? [flat.towerId.toString()] : [];
    }

    const gates = await Gate.find({ societyId: context.societyId, _id: { $in: context.gateIds }, isActive: true }).select('towerIds');
    const towerIds = [...new Set(gates.flatMap((gate) => gate.towerIds.map(String)))];
    return towerIds.length ? towerIds : null;
  }
}

export const visitorDirectoryService = new VisitorDirectoryService();
