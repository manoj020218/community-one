import { NextFunction, Response } from 'express';
import { AuthenticatedRequest } from '../../common/types';
import { assertSocietyAccess } from '../../common/utils/authScope';
import { sendCreated, sendSuccess } from '../../common/utils/response';
import { zoneService } from './zone.service';
import { bindDeviceSchema, createZoneSchema, parseAccessInput, updateZoneSchema } from './access-control.validator';

export class ZoneController {
  async listBySociety(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      assertSocietyAccess(req.user!, req.params.societyId);
      const zones = await zoneService.listBySociety(req.params.societyId);
      const bindings = await zoneService.listBindingsBySociety(req.params.societyId);
      const zonesWithBindings = zones.map((zone) => ({
        ...zone.toObject(),
        deviceCount: bindings.filter((b) => b.zoneId.toString() === zone._id!.toString()).length,
      }));
      sendSuccess(res, zonesWithBindings, 'Zones retrieved');
    } catch (error) {
      next(error);
    }
  }

  async create(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const dto = parseAccessInput(createZoneSchema, req.body);
      assertSocietyAccess(req.user!, dto.societyId);
      const zone = await zoneService.create(dto, req.user!.userId);
      sendCreated(res, zone, 'Zone created');
    } catch (error) {
      next(error);
    }
  }

  async update(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const existing = await zoneService.findById(req.params.id);
      assertSocietyAccess(req.user!, existing.societyId.toString());
      const dto = parseAccessInput(updateZoneSchema, req.body);
      const zone = await zoneService.update(req.params.id, dto);
      sendSuccess(res, zone, 'Zone updated');
    } catch (error) {
      next(error);
    }
  }

  async listBindings(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const zone = await zoneService.findById(req.params.id);
      assertSocietyAccess(req.user!, zone.societyId.toString());
      const bindings = await zoneService.listBindingsByZone(req.params.id);
      sendSuccess(res, bindings, 'Zone device bindings retrieved');
    } catch (error) {
      next(error);
    }
  }

  async bindDevice(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const zone = await zoneService.findById(req.params.id);
      assertSocietyAccess(req.user!, zone.societyId.toString());
      const dto = parseAccessInput(bindDeviceSchema, req.body);
      const binding = await zoneService.bindDevice(req.params.id, dto, req.user!.userId);
      sendCreated(res, binding, 'Device bound to zone');
    } catch (error) {
      next(error);
    }
  }

  async unbindDevice(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const binding = await zoneService.findBindingById(req.params.id);
      assertSocietyAccess(req.user!, binding.societyId.toString());
      await zoneService.unbindDevice(req.params.id);
      sendSuccess(res, null, 'Device unbound');
    } catch (error) {
      next(error);
    }
  }
}

export const zoneController = new ZoneController();
