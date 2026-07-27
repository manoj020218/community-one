import { ValidationError } from '../../common/errors/AppError';
import { buildPaginatedResult, parsePagination } from '../../common/utils/response';
import { SamaActorContext } from './sama.access.service';
import { EdgeFolioAccessClient, EdgeFolioM68EventRecord } from './edgeFolioAccess.client';
import { samaAccessEventResolveSchema } from './samaAccessEvent.schemas';
import { SamaAccessEvent } from './samaAccessEvent.model';
import { SamaDeviceBinding } from './samaDeviceBinding.model';
import { samaNotificationService } from './samaNotification.service';
import { samaSourceService } from './samaSource.service';
import { parseOrThrow } from './sama.validation';

function toDate(value?: string): Date | undefined {
  if (!value) return undefined;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

export class SamaAccessEventService {
  async listBySociety(societyId: string, query: Record<string, unknown>) {
    const filter: Record<string, unknown> = { societyId };
    if (typeof query.eventType === 'string' && query.eventType) filter.eventType = query.eventType;
    if (typeof query.externalDeviceId === 'string' && query.externalDeviceId) filter.externalDeviceId = query.externalDeviceId;
    if (typeof query.jenixDeviceId === 'string' && query.jenixDeviceId) filter.jenixDeviceId = query.jenixDeviceId;
    if (typeof query.exceptionStatus === 'string' && query.exceptionStatus) filter.exceptionStatus = query.exceptionStatus;
    const { page, limit, skip } = parsePagination(query);
    const [items, total] = await Promise.all([
      SamaAccessEvent.find(filter).sort({ occurredAt: -1, createdAt: -1 }).skip(skip).limit(limit),
      SamaAccessEvent.countDocuments(filter),
    ]);
    return buildPaginatedResult(items, total, page, limit);
  }

  async syncAccessEvents(context: SamaActorContext, limit: number = 100): Promise<Record<string, unknown>> {
    try {
      const client = new EdgeFolioAccessClient(await samaSourceService.getClientConfig(context.societyId));
      const records = await client.listM68Events(limit);
      const syncedAt = new Date();
      const ids = records.map((item) => String(item.id));
      const existing = await SamaAccessEvent.find({ societyId: context.societyId, sourceProvider: 'EDGEFOLIO', externalEventId: { $in: ids } }).lean();
      const existingIds = new Set(existing.map((item) => item.externalEventId));
      const bindings = await SamaDeviceBinding.find({ societyId: context.societyId, sourceProvider: 'EDGEFOLIO', externalDeviceType: 'M68', externalDeviceId: { $in: records.map((item) => item.devId) }, isActive: true }).lean();
      const bindingMap = new Map(bindings.map((item) => [item.externalDeviceId, item]));

      await SamaAccessEvent.bulkWrite(records.map((item) => ({
        updateOne: {
          filter: { societyId: context.societyId, sourceProvider: 'EDGEFOLIO', externalEventId: String(item.id) },
          update: { $set: this.mapEvent(context.societyId, item, bindingMap.get(item.devId), syncedAt) },
          upsert: true,
        },
      })));

      await samaSourceService.markSyncSuccess(context.societyId, 'lastAccessEventSyncAt');
      const unresolvedBindingCount = records.filter((item) => !bindingMap.has(item.devId)).length;
      const unknownEventCount = records.filter((item) => this.mapEventType(item.kind) === 'UNKNOWN').length;
      if (unresolvedBindingCount || unknownEventCount) {
        await samaNotificationService.notifySocietyRoles(context.societyId, ['SOCIETY_ADMIN', 'FACILITY_MANAGER'], {
          title: 'SAMA access exceptions detected',
          message: `Access sync found ${unresolvedBindingCount + unknownEventCount} exception(s) that need review.`,
          actionUrl: '/sama/reports/access-exceptions',
          entityType: 'SamaAccessEvent',
          type: 'WARNING',
          priority: 'HIGH',
        });
      }
      return {
        provider: 'EDGEFOLIO',
        importedCount: records.length,
        createdCount: ids.filter((id) => !existingIds.has(id)).length,
        updatedCount: records.length - ids.filter((id) => !existingIds.has(id)).length,
        unresolvedBindingCount,
        unknownEventCount,
        exceptionCount: unresolvedBindingCount + unknownEventCount,
        syncedAt,
      };
    } catch (error: any) {
      await samaSourceService.markSyncFailure(context.societyId, error.message || 'Access event sync failed');
      throw error;
    }
  }

  async resolve(context: SamaActorContext, eventId: string, input: unknown) {
    const dto = parseOrThrow(samaAccessEventResolveSchema, input);
    const event = await SamaAccessEvent.findOne({ _id: eventId, societyId: context.societyId }).orFail();
    if (dto.action === 'IGNORE') {
      event.exceptionStatus = 'IGNORED';
      event.resolutionNotes = dto.resolutionNotes;
    } else {
      const binding = await SamaDeviceBinding.findOne({ _id: dto.bindingId, societyId: context.societyId, isActive: true }).orFail();
      if (binding.externalDeviceId !== event.externalDeviceId) throw new ValidationError('Binding does not match the access event device');
      event.deviceBindingId = binding._id.toString();
      event.jenixDeviceId = binding.jenixDeviceId;
      event.gateId = binding.gateId;
      event.exceptionStatus = 'RESOLVED';
      event.exceptionReason = undefined;
      event.resolutionNotes = dto.resolutionNotes;
    }
    event.resolvedAt = new Date();
    event.resolvedByUserId = context.user.userId;
    await event.save();
    return event;
  }

  private mapEvent(societyId: string, item: EdgeFolioM68EventRecord, binding: any, syncedAt: Date): Record<string, unknown> {
    const eventType = this.mapEventType(item.kind);
    const exceptionStatus = !binding ? 'UNMATCHED_DEVICE' : eventType === 'UNKNOWN' ? 'UNKNOWN_EVENT' : 'MATCHED';
    return {
      societyId,
      sourceProvider: 'EDGEFOLIO',
      sourceType: 'M68',
      externalEventId: String(item.id),
      externalDeviceType: 'M68',
      externalDeviceId: item.devId,
      externalKind: item.kind,
      eventType,
      deviceBindingId: binding?._id,
      jenixDeviceId: binding?.jenixDeviceId,
      gateId: binding?.gateId,
      exceptionStatus,
      exceptionReason: exceptionStatus === 'UNMATCHED_DEVICE' ? 'No active Jenix device binding was found for this external device' : exceptionStatus === 'UNKNOWN_EVENT' ? 'EdgeFolio emitted an event kind that SAMA does not classify yet' : undefined,
      occurredAt: toDate(item.receivedAt) || syncedAt,
      lastSyncedAt: syncedAt,
      rawData: item,
    };
  }

  private mapEventType(kind: string): string {
    const value = kind.toUpperCase();
    if (value.includes('UNREGISTERED')) return 'UNREGISTERED_SIGHTING';
    if (value.includes('BARCODE') || value.includes('CARD')) return 'CREDENTIAL_SCAN';
    if (value.includes('ENROLL')) return 'CREDENTIAL_ENROLLMENT';
    if (value.includes('OPERATION') || value.includes('STATUS')) return 'DEVICE_OPERATION';
    return 'UNKNOWN';
  }
}

export const samaAccessEventService = new SamaAccessEventService();
