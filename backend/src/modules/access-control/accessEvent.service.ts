import { NotFoundError } from '../../common/errors/AppError';
import { DeviceEventLog } from '../device/deviceEventLog.model';
import { accessCredentialService } from './accessCredential.service';
import { AccessEvent, IAccessEventDocument } from './accessEvent.model';
import { ZoneDeviceBinding } from './zoneDeviceBinding.model';

export class AccessEventService {
  async sync(societyId: string): Promise<{ processedBindings: number; newEvents: number }> {
    const bindings = await ZoneDeviceBinding.find({ societyId, isActive: true });
    let newEvents = 0;

    for (const binding of bindings) {
      const since = binding.lastSyncedReceivedAt || new Date(0);
      const logs = await DeviceEventLog.find({ deviceId: binding.deviceId, receivedAt: { $gt: since } }).sort({ receivedAt: 1 });
      if (logs.length === 0) continue;

      for (const log of logs) {
        for (const event of log.parsedEvents) {
          const residentId = await accessCredentialService.resolve(binding.deviceId.toString(), event.deviceExternalUserId);
          const result = await AccessEvent.findOneAndUpdate(
            { deviceId: binding.deviceId, deviceExternalUserId: event.deviceExternalUserId, occurredAt: event.timestamp },
            {
              $setOnInsert: {
                societyId,
                zoneId: binding.zoneId,
                deviceId: binding.deviceId,
                residentId: residentId || undefined,
                deviceExternalUserId: event.deviceExternalUserId,
                occurredAt: event.timestamp,
                passed: event.passed,
                matchStatus: residentId ? 'MATCHED' : 'UNRESOLVED_CREDENTIAL',
                deviceEventLogId: log._id,
              },
            },
            { upsert: true, includeResultMetadata: true }
          );
          if (!result.lastErrorObject?.updatedExisting) newEvents += 1;
        }
      }

      const latest = logs[logs.length - 1];
      binding.lastSyncedReceivedAt = latest.receivedAt;
      await binding.save();
    }

    return { processedBindings: bindings.length, newEvents };
  }

  async listBySociety(societyId: string, matchStatus?: string): Promise<IAccessEventDocument[]> {
    await this.sync(societyId);
    const query: Record<string, unknown> = { societyId };
    if (matchStatus) query.matchStatus = matchStatus;
    return AccessEvent.find(query)
      .populate('zoneId', 'name zoneType')
      .populate('residentId', 'name mobile')
      .sort({ occurredAt: -1 })
      .limit(200);
  }

  async findById(eventId: string): Promise<IAccessEventDocument> {
    const event = await AccessEvent.findById(eventId);
    if (!event) throw new NotFoundError('Access event');
    return event;
  }

  async resolve(eventId: string, residentId: string): Promise<IAccessEventDocument> {
    const event = await AccessEvent.findByIdAndUpdate(
      eventId,
      { residentId, matchStatus: 'MATCHED' },
      { new: true }
    )
      .populate('zoneId', 'name zoneType')
      .populate('residentId', 'name mobile');
    if (!event) throw new NotFoundError('Access event');
    return event;
  }
}

export const accessEventService = new AccessEventService();
