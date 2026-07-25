import { AuthorizationError, NotFoundError } from '../../common/errors/AppError';
import { PaginatedResult } from '../../common/types';
import { buildPaginatedResult } from '../../common/utils/response';
import { auditService } from '../audit/audit.service';
import { Gate } from '../gate/gate.model';
import { VisitorActorContext } from './visitor.access.service';
import { maskMobile, normalizeVisitorMobile, VISITOR_STATUSES } from './visitor.constants';
import { VisitorRequest, IVisitorRequestDocument } from './visitor.model';

export interface VisitorGateActivity {
  gateId: string;
  gateName: string;
  count: number;
}

export interface VisitorSummary {
  [key: string]: number | VisitorGateActivity[];
  CURRENTLY_INSIDE: number;
  TODAY_COUNT: number;
  AVG_APPROVAL_MINUTES: number;
  BY_GATE: VisitorGateActivity[];
}

export class VisitorQueryService {
  async listRequests(
    context: VisitorActorContext,
    filter: Record<string, string | undefined>,
    page: number,
    limit: number
  ): Promise<PaginatedResult<IVisitorRequestDocument>> {
    const query = this.buildScopeQuery(context);
    if (filter.status) query.status = filter.status;
    if (filter.gateId) query.gateId = filter.gateId;
    if (filter.flatId) query.flatId = filter.flatId;
    if (filter.towerId) query.towerId = filter.towerId;
    if (filter.search) {
      const term = filter.search.trim();
      if (term) {
        const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        query.$or = [
          { visitorName: { $regex: escaped, $options: 'i' } },
          { visitorMobileNormalized: { $regex: normalizeVisitorMobile(term) || escaped, $options: 'i' } },
        ];
      }
    }
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      this.baseQuery(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
      VisitorRequest.countDocuments(query),
    ]);
    items.forEach((item) => this.maskMobileIfNeeded(context, item));
    return buildPaginatedResult(items, total, page, limit);
  }

  async getRequest(context: VisitorActorContext, requestId: string): Promise<IVisitorRequestDocument> {
    const request = await this.baseQuery({ ...this.buildScopeQuery(context), _id: requestId }).findOne();
    if (!request) throw new NotFoundError('Visitor request');
    this.maskMobileIfNeeded(context, request);
    return request;
  }

  /**
   * Society-wide admin/report views see a masked mobile number by default — the
   * assigned guard and the resident of the flat (who need to actually call the
   * visitor back) always see the real number, as does anyone with the explicit
   * override permission.
   */
  private maskMobileIfNeeded(context: VisitorActorContext, request: IVisitorRequestDocument): void {
    if (context.canViewSociety && !context.canOverride && request.visitorMobile) {
      request.visitorMobile = maskMobile(request.visitorMobile);
    }
  }

  async auditView(context: VisitorActorContext, request: IVisitorRequestDocument): Promise<void> {
    await auditService.log({
      societyId: context.societyId,
      actorUserId: context.user.userId,
      actorRole: context.user.roleCode,
      moduleCode: 'VISITOR',
      action: 'VISITOR_REQUEST_VIEWED',
      entityType: 'VisitorRequest',
      entityId: request._id!.toString(),
      ipAddress: '',
    });
  }

  async getSummary(context: VisitorActorContext): Promise<VisitorSummary> {
    const query = this.buildScopeQuery(context);
    const requests = await VisitorRequest.find(query).select('status entryAt exitAt gateId decisionAt createdAt').lean();

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const byGateCounts: Record<string, number> = {};
    let approvalMinutesTotal = 0;
    let approvalMinutesCount = 0;
    let todayCount = 0;

    const tally = requests.reduce<Record<string, number>>((acc, request) => {
      acc[request.status] = (acc[request.status] || 0) + 1;
      if (request.entryAt && !request.exitAt) acc.CURRENTLY_INSIDE = (acc.CURRENTLY_INSIDE || 0) + 1;
      if (request.createdAt && new Date(request.createdAt) >= startOfToday) todayCount += 1;
      if (request.status === VISITOR_STATUSES.APPROVED && request.decisionAt && request.createdAt) {
        approvalMinutesTotal += (new Date(request.decisionAt).getTime() - new Date(request.createdAt).getTime()) / 60000;
        approvalMinutesCount += 1;
      }
      if (request.gateId) {
        const gateKey = request.gateId.toString();
        byGateCounts[gateKey] = (byGateCounts[gateKey] || 0) + 1;
      }
      return acc;
    }, { CURRENTLY_INSIDE: 0 });

    const gateIds = Object.keys(byGateCounts);
    const gates = gateIds.length ? await Gate.find({ _id: { $in: gateIds } }).select('name') : [];
    const byGate: VisitorGateActivity[] = gates.map((gate) => ({
      gateId: gate._id!.toString(),
      gateName: gate.name,
      count: byGateCounts[gate._id!.toString()] || 0,
    }));

    return {
      ...tally,
      TODAY_COUNT: todayCount,
      AVG_APPROVAL_MINUTES: approvalMinutesCount ? Math.round(approvalMinutesTotal / approvalMinutesCount) : 0,
      BY_GATE: byGate,
    } as VisitorSummary;
  }

  private baseQuery(query: Record<string, unknown>) {
    return VisitorRequest.find(query)
      .populate('gateId', 'name code entryType')
      .populate('towerId', 'name code')
      .populate('flatId', 'flatNo')
      .populate('createdByUserId', 'name roleCode')
      .populate('decisionByUserId', 'name roleCode')
      .populate('entryConfirmedByUserId', 'name roleCode')
      .populate('exitConfirmedByUserId', 'name roleCode')
      .populate('visitorPhotoFileId', 'originalName');
  }

  private buildScopeQuery(context: VisitorActorContext): Record<string, unknown> {
    if (context.canViewSociety || context.canOverride) return { societyId: context.societyId };
    if (context.flatId) return { societyId: context.societyId, flatId: context.flatId };
    if (context.gateIds.length) return { societyId: context.societyId, gateId: { $in: context.gateIds } };
    throw new AuthorizationError('No Visitor Management scope available for this user');
  }
}

export const visitorQueryService = new VisitorQueryService();
