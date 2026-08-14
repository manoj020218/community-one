import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../../common/types';
import { deviceService } from './device.service';
import { sendSuccess, sendCreated } from '../../common/utils/response';
import { auditService } from '../audit/audit.service';

export class DeviceController {
  async create(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const device = await deviceService.create(req.body, req.user!.userId);
      await auditService.log({ societyId: req.body.societyId, actorUserId: req.user!.userId, actorRole: req.user!.roleCode, moduleCode: 'CORE', action: 'DEVICE_MAPPED', entityType: 'Device', entityId: device._id!.toString(), newValue: { deviceName: device.deviceName }, ipAddress: req.ip });
      sendCreated(res, device, 'Device registered');
    } catch (error) { next(error); }
  }

  async findBySociety(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const devices = await deviceService.findBySociety(req.params.societyId);
      sendSuccess(res, devices, 'Devices retrieved');
    } catch (error) { next(error); }
  }

  async findById(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const device = await deviceService.findById(req.params.id);
      sendSuccess(res, device);
    } catch (error) { next(error); }
  }

  async update(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const device = await deviceService.update(req.params.id, req.body);
      sendSuccess(res, device, 'Device updated');
    } catch (error) { next(error); }
  }

  async heartbeat(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const apiKey = req.headers['x-device-api-key'] as string;
      const device = await deviceService.heartbeat(req.params.id, apiKey, req.body);
      sendSuccess(res, { onlineStatus: device.onlineStatus, lastHeartbeatAt: device.lastHeartbeatAt }, 'Heartbeat received');
    } catch (error) { next(error); }
  }

  async disable(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      await deviceService.disable(req.params.id);
      sendSuccess(res, null, 'Device disabled');
    } catch (error) { next(error); }
  }

  async pushEvent(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { log, photoRequest } = await deviceService.pushEvent(req.params.apiKey, req.body);
      sendSuccess(res, { received: log.parsedEvents.length, warning: log.warning, photoRequest }, 'Event received');
    } catch (error) { next(error); }
  }

  async listEventLogs(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const limit = Math.min(Number(req.query.limit) || 50, 200);
      const logs = await deviceService.listEventLogs(req.params.id, limit);
      sendSuccess(res, logs, 'Event logs retrieved');
    } catch (error) { next(error); }
  }

  async requestPhoto(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { deviceExternalUserId, checkinTime } = req.body;
      const requestId = await deviceService.requestPhoto(req.params.id, deviceExternalUserId, checkinTime);
      sendCreated(res, { requestId }, 'Photo requested — the gateway will fetch it on its next poll');
    } catch (error) { next(error); }
  }

  async getPhotoRequestStatus(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      sendSuccess(res, deviceService.getPhotoRequestStatus(req.params.requestId));
    } catch (error) { next(error); }
  }

  async fulfillPhoto(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { requestId, photoBase64 } = req.body;
      deviceService.fulfillPhoto(req.params.apiKey, requestId, photoBase64);
      sendSuccess(res, null, 'Photo delivered');
    } catch (error) { next(error); }
  }
}

export const deviceController = new DeviceController();
