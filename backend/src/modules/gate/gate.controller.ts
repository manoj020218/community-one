import { NextFunction, Response } from 'express';
import { AuthenticatedRequest } from '../../common/types';
import { sendCreated, sendSuccess } from '../../common/utils/response';
import { resolveActorSocietyId } from '../../common/utils/authScope';
import { auditService } from '../audit/audit.service';
import { gateMappingService } from './gate.mapping.service';
import { gateService } from './gate.service';

export class GateController {
  async create(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const societyId = resolveActorSocietyId(req.user!, req.body.societyId);
      const gate = await gateService.create({ ...req.body, societyId }, req.user!.userId);
      await auditService.log({ societyId, actorUserId: req.user!.userId, actorRole: req.user!.roleCode, moduleCode: 'VISITOR', action: 'GATE_CREATED', entityType: 'Gate', entityId: gate._id!.toString(), newValue: { name: gate.name, code: gate.code }, ipAddress: req.ip });
      sendCreated(res, gate, 'Gate created');
    } catch (error) { next(error); }
  }

  async findBySociety(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const societyId = resolveActorSocietyId(req.user!, req.params.societyId, req.query.societyId as string);
      sendSuccess(res, await gateService.findBySociety(societyId), 'Gates retrieved');
    } catch (error) { next(error); }
  }

  async findById(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      sendSuccess(res, await gateService.findById(req.params.id));
    } catch (error) { next(error); }
  }

  async update(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const gate = await gateService.update(req.params.id, req.body);
      await auditService.log({ societyId: gate.societyId.toString(), actorUserId: req.user!.userId, actorRole: req.user!.roleCode, moduleCode: 'VISITOR', action: 'GATE_UPDATED', entityType: 'Gate', entityId: gate._id!.toString(), newValue: { name: gate.name, code: gate.code }, ipAddress: req.ip });
      sendSuccess(res, gate, 'Gate updated');
    } catch (error) { next(error); }
  }

  async disable(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      await gateService.disable(req.params.id);
      sendSuccess(res, null, 'Gate disabled');
    } catch (error) { next(error); }
  }

  async previewLegacyMappings(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const societyId = resolveActorSocietyId(req.user!, req.query.societyId as string);
      sendSuccess(res, await gateMappingService.previewLegacyMappings(societyId), 'Legacy gate mappings retrieved');
    } catch (error) { next(error); }
  }

  async linkDevices(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const societyId = resolveActorSocietyId(req.user!, req.body.societyId);
      const linkedCount = await gateMappingService.linkDevicesToGate(societyId, req.params.gateId, req.body);
      sendSuccess(res, { linkedCount }, 'Devices linked to gate');
    } catch (error) { next(error); }
  }
}

export const gateController = new GateController();
