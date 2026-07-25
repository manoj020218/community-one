import { auditService } from '../audit/audit.service';
import { visitorNotificationService } from './visitor.notification.service';
import { visitorRealtimeService } from './visitor.realtime.service';
import { VISITOR_STATUSES } from './visitor.constants';
import { VisitorRequest } from './visitor.model';

export class VisitorExpiryService {
  async expirePendingBatch(limit: number): Promise<number> {
    const candidates = await VisitorRequest.find({
      status: VISITOR_STATUSES.PENDING_APPROVAL,
      expiresAt: { $lte: new Date() },
    }).sort({ expiresAt: 1 }).limit(limit).select('_id societyId gateId flatId createdByUserId');

    let processed = 0;
    for (const candidate of candidates) {
      const updated = await VisitorRequest.findOneAndUpdate(
        { _id: candidate._id, status: VISITOR_STATUSES.PENDING_APPROVAL },
        { $set: { status: VISITOR_STATUSES.EXPIRED, statusChangedAt: new Date(), closedAt: new Date() }, $inc: { version: 1 } },
        { new: true }
      );
      if (!updated) continue;
      processed += 1;
      await auditService.log({ societyId: updated.societyId.toString(), actorUserId: updated.createdByUserId.toString(), actorRole: 'SYSTEM', moduleCode: 'VISITOR', action: 'VISITOR_REQUEST_EXPIRED', entityType: 'VisitorRequest', entityId: updated._id!.toString(), newValue: { status: updated.status }, ipAddress: 'system' });
      await visitorNotificationService.dispatch({ societyId: updated.societyId.toString(), userIds: [updated.createdByUserId.toString()], title: 'Visitor request expired', message: 'A visitor request expired before approval', entityId: updated._id!.toString(), metadata: { status: updated.status }, pushData: { requestId: updated._id!.toString(), societyId: updated.societyId.toString(), status: updated.status }, actorUserId: updated.createdByUserId.toString(), actorRole: 'SYSTEM' });
      visitorRealtimeService.publish({ type: 'visitor.request.expired', societyId: updated.societyId.toString(), gateId: updated.gateId.toString(), flatId: updated.flatId.toString(), data: { requestId: updated._id!.toString(), status: updated.status, statusChangedAt: updated.statusChangedAt } });
    }
    return processed;
  }
}

export const visitorExpiryService = new VisitorExpiryService();
