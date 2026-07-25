import { AuthorizationError, ConflictError, NotFoundError, ValidationError } from '../../common/errors/AppError';
import { PERMISSIONS } from '../../config/constants';
import { auditService } from '../audit/audit.service';
import { FileAsset } from '../fileAsset/fileAsset.model';
import { Flat } from '../flat/flat.model';
import { Gate } from '../gate/gate.model';
import { Resident } from '../resident/resident.model';
import { User } from '../user/user.model';
import { VisitorActorContext, visitorAccessService } from './visitor.access.service';
import { isValidVisitorMobile, normalizeVisitorMobile, VISITOR_STATUSES } from './visitor.constants';
import { VisitorRequest, IVisitorRequestDocument } from './visitor.model';
import { visitorNotificationService } from './visitor.notification.service';
import { visitorRealtimeService } from './visitor.realtime.service';
import { visitorSettingsService } from './visitor.settings.service';

export interface CreateVisitorRequestDto {
  gateId?: string;
  towerId?: string;
  flatId: string;
  visitorName: string;
  visitorMobile?: string;
  visitorPhotoFileId?: string;
  purpose?: string;
  vehicleNumber?: string;
  clientRequestId?: string;
}

export class VisitorActionService {
  async create(context: VisitorActorContext, dto: CreateVisitorRequestDto): Promise<IVisitorRequestDocument> {
    const settings = await visitorSettingsService.getSettings(context.societyId);
    const gateId = dto.gateId || (context.gateIds.length === 1 ? context.gateIds[0] : undefined);
    if (!gateId) throw new ValidationError('gateId is required for visitor request creation');
    visitorAccessService.assertGateAccess(context, gateId);
    if (settings.requireVisitorPhoto && !dto.visitorPhotoFileId) throw new ValidationError('Visitor photo is required');
    if (settings.requireVisitorMobile && !dto.visitorMobile) throw new ValidationError('Visitor mobile is required');
    if (dto.visitorMobile && !isValidVisitorMobile(dto.visitorMobile)) throw new ValidationError('Visitor mobile number format is invalid');
    if (settings.requirePurpose && !dto.purpose) throw new ValidationError('Visitor purpose is required');
    if (settings.allowedGateIds.length && !settings.allowedGateIds.includes(gateId)) throw new ValidationError('Selected gate is not enabled for Visitor Management');

    const [gate, flat] = await Promise.all([
      Gate.findOne({ _id: gateId, societyId: context.societyId, isActive: true }),
      Flat.findOne({ _id: dto.flatId, societyId: context.societyId, isActive: true }).select('towerId flatNo'),
    ]);
    if (!gate) throw new ValidationError('Selected gate was not found');
    if (!flat) throw new ValidationError('Selected flat was not found');
    if (dto.towerId && flat.towerId.toString() !== dto.towerId) throw new ValidationError('Selected flat does not belong to the selected tower');
    if (dto.visitorPhotoFileId) await this.assertPhoto(context.societyId, dto.visitorPhotoFileId);

    const normalizedMobile = dto.visitorMobile ? normalizeVisitorMobile(dto.visitorMobile) : undefined;
    const duplicate = await this.findDuplicate(context, dto, gateId, flat.towerId.toString(), normalizedMobile, settings.duplicateWindowSeconds);
    if (duplicate) return this.loadRequest(duplicate._id!.toString());
    const openCount = await VisitorRequest.countDocuments({ societyId: context.societyId, flatId: dto.flatId, status: { $in: [VISITOR_STATUSES.PENDING_APPROVAL, VISITOR_STATUSES.APPROVED, VISITOR_STATUSES.ENTRY_CONFIRMED] } });
    if (openCount >= settings.maxPendingRequestsPerFlat) throw new ValidationError('Pending visitor request limit reached for this flat');
    if (normalizedMobile) {
      const mobileCount = await VisitorRequest.countDocuments({ societyId: context.societyId, visitorMobileNormalized: normalizedMobile, createdAt: { $gte: new Date(Date.now() - 60 * 60 * 1000) } });
      if (mobileCount >= settings.maxRequestsPerMobilePerHour) throw new ValidationError('Too many visitor requests for this mobile number recently. Please try again later.');
    }

    const hostUserIds = await this.resolveHostUserIds(context.societyId, dto.flatId);
    const now = new Date();
    const request = await VisitorRequest.create({
      societyId: context.societyId,
      gateId,
      towerId: flat.towerId,
      flatId: dto.flatId,
      requestedHostUserIds: hostUserIds,
      createdByUserId: context.user.userId,
      visitorName: dto.visitorName.trim(),
      visitorMobile: dto.visitorMobile?.trim(),
      visitorMobileNormalized: normalizedMobile,
      visitorPhotoFileId: dto.visitorPhotoFileId,
      purpose: dto.purpose?.trim(),
      vehicleNumber: dto.vehicleNumber?.trim(),
      status: VISITOR_STATUSES.PENDING_APPROVAL,
      statusChangedAt: now,
      expiresAt: new Date(now.getTime() + settings.defaultApprovalExpiryMinutes * 60000),
      clientRequestId: dto.clientRequestId?.trim(),
      requestSource: 'GUARD',
    });

    await auditService.log({ societyId: context.societyId, actorUserId: context.user.userId, actorRole: context.user.roleCode, moduleCode: 'VISITOR', action: 'VISITOR_REQUEST_CREATED', entityType: 'VisitorRequest', entityId: request._id!.toString(), newValue: { gateId, flatId: dto.flatId, visitorName: request.visitorName, photoAttached: Boolean(dto.visitorPhotoFileId) }, ipAddress: '' });
    const detailed = await this.loadRequest(request._id!.toString());
    await visitorNotificationService.dispatch({ societyId: context.societyId, userIds: hostUserIds, title: 'Visitor approval requested', message: `${request.visitorName} is waiting at ${gate.name}`, pushBody: `New visitor request at ${gate.name}`, entityId: request._id!.toString(), actionUrl: `/visitor/requests/${request._id}`, metadata: { gateId, flatId: dto.flatId }, pushData: { requestId: request._id!.toString(), societyId: context.societyId, flatId: dto.flatId }, actorUserId: context.user.userId, actorRole: context.user.roleCode });
    this.publish(detailed, 'visitor.request.created');
    return detailed;
  }

  async approve(context: VisitorActorContext, requestId: string, approvalNote?: string): Promise<IVisitorRequestDocument> {
    return this.respond(context, requestId, VISITOR_STATUSES.APPROVED, { approvalNote });
  }

  async reject(context: VisitorActorContext, requestId: string, rejectionReason?: string): Promise<IVisitorRequestDocument> {
    return this.respond(context, requestId, VISITOR_STATUSES.REJECTED, { rejectionReason });
  }

  async cancel(context: VisitorActorContext, requestId: string, reason?: string): Promise<IVisitorRequestDocument> {
    const settings = await visitorSettingsService.getSettings(context.societyId);
    const request = await this.loadRequest(requestId);
    const overrideUsed = visitorAccessService.assertGateAccess(context, this.toId(request.gateId));
    const createdByUserId = String((request.createdByUserId as any)?._id || request.createdByUserId);
    if (!context.canOverride && (!settings.allowGuardCancellation || createdByUserId !== context.user.userId)) throw new AuthorizationError('Guard cancellation is not permitted for this request');
    return this.transitionRequest(context, requestId, VISITOR_STATUSES.CANCELLED, { rejectionReason: reason, closedAt: new Date() }, 'VISITOR_REQUEST_CANCELLED', overrideUsed);
  }

  async confirmEntry(context: VisitorActorContext, requestId: string): Promise<IVisitorRequestDocument> {
    const request = await this.loadRequest(requestId);
    const overrideUsed = visitorAccessService.assertGateAccess(context, this.toId(request.gateId));
    return this.transitionRequest(context, requestId, VISITOR_STATUSES.ENTRY_CONFIRMED, { entryConfirmedByUserId: context.user.userId, entryAt: new Date() }, 'VISITOR_ENTRY_CONFIRMED', overrideUsed);
  }

  async confirmExit(context: VisitorActorContext, requestId: string): Promise<IVisitorRequestDocument> {
    const settings = await visitorSettingsService.getSettings(context.societyId);
    if (settings.exitConfirmationMode === 'AUTO') throw new ValidationError('Exit confirmation is disabled for this society');
    const request = await this.loadRequest(requestId);

    // Who may confirm exit is society-configurable: the guard at the gate, or the resident of the flat.
    const overrideUsed = settings.exitConfirmationMode === 'RESIDENT'
      ? visitorAccessService.assertFlatAccess(context, this.toId(request.flatId))
      : visitorAccessService.assertGateAccess(context, this.toId(request.gateId));

    return this.transitionRequest(context, requestId, VISITOR_STATUSES.EXIT_CONFIRMED, { exitConfirmedByUserId: context.user.userId, exitAt: new Date(), closedAt: new Date() }, 'VISITOR_EXIT_CONFIRMED', overrideUsed);
  }

  private async respond(context: VisitorActorContext, requestId: string, status: 'APPROVED' | 'REJECTED', extra: { approvalNote?: string; rejectionReason?: string }): Promise<IVisitorRequestDocument> {
    const settings = await visitorSettingsService.getSettings(context.societyId);
    const request = await this.loadRequest(requestId);
    const overrideUsed = visitorAccessService.assertFlatAccess(context, this.toId(request.flatId));
    if (status === VISITOR_STATUSES.REJECTED && settings.requireRejectionReason && !extra.rejectionReason) throw new ValidationError('Rejection reason is required');
    return this.transitionRequest(context, requestId, status, { ...extra, decisionByUserId: context.user.userId, decisionAt: new Date(), closedAt: status === VISITOR_STATUSES.REJECTED ? new Date() : undefined }, `VISITOR_REQUEST_${status}`, overrideUsed);
  }

  private async transitionRequest(context: VisitorActorContext, requestId: string, nextStatus: string, extra: Record<string, unknown>, action: string, overrideUsed = false): Promise<IVisitorRequestDocument> {
    const currentStatus = this.getExpectedCurrentStatus(nextStatus);
    const updated = await VisitorRequest.findOneAndUpdate({ _id: requestId, societyId: context.societyId, status: currentStatus }, { $set: { ...extra, status: nextStatus, statusChangedAt: new Date() }, $inc: { version: 1 } }, { new: true });
    if (!updated) {
      const current = await VisitorRequest.findById(requestId).select('status');
      throw new ConflictError(`Request already handled. Current status: ${current?.status || 'unknown'}`);
    }
    await auditService.log({ societyId: context.societyId, actorUserId: context.user.userId, actorRole: context.user.roleCode, moduleCode: 'VISITOR', action, entityType: 'VisitorRequest', entityId: requestId, oldValue: { status: currentStatus }, newValue: { status: nextStatus, gateId: this.toId(updated.gateId), overrideUsed }, ipAddress: '' });
    const detailed = await this.loadRequest(requestId);
    await visitorNotificationService.dispatch({ societyId: context.societyId, userIds: [updated.createdByUserId.toString()], title: 'Visitor request updated', message: `Visitor request is now ${nextStatus.replace(/_/g, ' ')}`, entityId: requestId, actionUrl: `/visitor/requests/${requestId}`, metadata: { status: nextStatus }, pushData: { requestId, societyId: context.societyId, status: nextStatus }, actorUserId: context.user.userId, actorRole: context.user.roleCode });
    this.publish(detailed, 'visitor.request.updated');
    return detailed;
  }

  private async assertPhoto(societyId: string, fileId: string): Promise<void> {
    const file = await FileAsset.findOne({ _id: fileId, societyId, isActive: true });
    if (!file) throw new ValidationError('Visitor photo file was not found');
  }

  private async findDuplicate(context: VisitorActorContext, dto: CreateVisitorRequestDto, gateId: string, towerId: string, normalizedMobile: string | undefined, windowSeconds: number) {
    if (dto.clientRequestId) {
      const request = await VisitorRequest.findOne({ societyId: context.societyId, createdByUserId: context.user.userId, clientRequestId: dto.clientRequestId.trim() });
      if (request) return request;
    }
    return VisitorRequest.findOne({ societyId: context.societyId, createdByUserId: context.user.userId, gateId, towerId, flatId: dto.flatId, visitorName: dto.visitorName.trim(), visitorMobileNormalized: normalizedMobile, status: VISITOR_STATUSES.PENDING_APPROVAL, createdAt: { $gte: new Date(Date.now() - windowSeconds * 1000) } });
  }

  private async resolveHostUserIds(societyId: string, flatId: string): Promise<string[]> {
    const residents = await Resident.find({ societyId, flatId, isActive: true, status: 'ACTIVE', loginAllowed: true, userId: { $exists: true, $ne: null } }).select('userId');
    const users = await User.find({ _id: { $in: residents.map((item) => item.userId) }, societyId, isActive: true, permissions: PERMISSIONS.VISITOR_REQUEST_RESPOND_OWN_FLAT }).select('_id');
    if (!users.length) throw new ValidationError('No eligible resident login found for the selected flat');
    return users.map((user) => user._id!.toString());
  }

  private async loadRequest(requestId: string): Promise<IVisitorRequestDocument> {
    const request = await VisitorRequest.findById(requestId).populate('gateId', 'name code entryType').populate('towerId', 'name code').populate('flatId', 'flatNo').populate('createdByUserId', 'name roleCode').populate('decisionByUserId', 'name roleCode').populate('entryConfirmedByUserId', 'name roleCode').populate('exitConfirmedByUserId', 'name roleCode').populate('visitorPhotoFileId', 'originalName');
    if (!request) throw new NotFoundError('Visitor request');
    return request;
  }

  private publish(request: IVisitorRequestDocument, type: string): void {
    visitorRealtimeService.publish({ type, societyId: this.toId(request.societyId), gateId: this.toId(request.gateId), flatId: this.toId(request.flatId), data: { requestId: request._id!.toString(), status: request.status, statusChangedAt: request.statusChangedAt } });
  }

  private getExpectedCurrentStatus(nextStatus: string): string {
    if (nextStatus === VISITOR_STATUSES.APPROVED || nextStatus === VISITOR_STATUSES.REJECTED) return VISITOR_STATUSES.PENDING_APPROVAL;
    if (nextStatus === VISITOR_STATUSES.CANCELLED) return VISITOR_STATUSES.PENDING_APPROVAL;
    if (nextStatus === VISITOR_STATUSES.ENTRY_CONFIRMED) return VISITOR_STATUSES.APPROVED;
    if (nextStatus === VISITOR_STATUSES.EXIT_CONFIRMED) return VISITOR_STATUSES.ENTRY_CONFIRMED;
    throw new ValidationError(`Unsupported status transition: ${nextStatus}`);
  }

  private toId(value: any): string {
    return String(value?._id || value);
  }
}

export const visitorActionService = new VisitorActionService();
