import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../../common/types';
import { vehicleService } from './vehicle.service';
import { sendSuccess, sendCreated, sendPaginated, parsePagination } from '../../common/utils/response';
import { auditService } from '../audit/audit.service';

export class VehicleController {
  async create(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const vehicle = await vehicleService.create(req.body, req.user!.userId);
      await auditService.log({ societyId: req.body.societyId, actorUserId: req.user!.userId, actorRole: req.user!.roleCode, moduleCode: 'CORE', action: 'CREATE', entityType: 'Vehicle', entityId: vehicle._id!.toString(), newValue: { vehicleNo: vehicle.vehicleNo }, ipAddress: req.ip });
      sendCreated(res, vehicle, 'Vehicle registered');
    } catch (error) { next(error); }
  }

  async findBySociety(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { page, limit } = parsePagination(req.query);
      const result = await vehicleService.findBySociety(req.params.societyId, page, limit, req.query.search as string);
      sendPaginated(res, result, 'Vehicles retrieved');
    } catch (error) { next(error); }
  }

  async findByFlat(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const vehicles = await vehicleService.findByFlat(req.params.flatId);
      sendSuccess(res, vehicles, 'Vehicles retrieved');
    } catch (error) { next(error); }
  }

  async findById(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const vehicle = await vehicleService.findById(req.params.id);
      sendSuccess(res, vehicle);
    } catch (error) { next(error); }
  }

  async update(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const vehicle = await vehicleService.update(req.params.id, req.body);
      sendSuccess(res, vehicle, 'Vehicle updated');
    } catch (error) { next(error); }
  }

  async disable(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      await vehicleService.disable(req.params.id);
      sendSuccess(res, null, 'Vehicle disabled');
    } catch (error) { next(error); }
  }
}

export const vehicleController = new VehicleController();
