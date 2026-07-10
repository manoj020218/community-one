import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../../common/types';
import { residentService } from './resident.service';
import { sendSuccess, sendCreated, sendPaginated, parsePagination } from '../../common/utils/response';
import { auditService } from '../audit/audit.service';

export class ResidentController {
  async create(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const resident = await residentService.create(req.body, req.user!.userId);
      await auditService.log({
        societyId: req.body.societyId, actorUserId: req.user!.userId, actorRole: req.user!.roleCode,
        moduleCode: 'CORE', action: 'CREATE', entityType: 'Resident',
        entityId: resident._id!.toString(), newValue: { name: resident.name }, ipAddress: req.ip,
      });
      sendCreated(res, resident, 'Resident added');
    } catch (error) { next(error); }
  }

  async findBySociety(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { page, limit } = parsePagination(req.query);
      const result = await residentService.findBySociety(req.params.societyId, page, limit, req.query.search as string);
      sendPaginated(res, result, 'Residents retrieved');
    } catch (error) { next(error); }
  }

  async findByFlat(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const residents = await residentService.findByFlat(req.params.flatId);
      sendSuccess(res, residents, 'Residents retrieved');
    } catch (error) { next(error); }
  }

  async findById(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const resident = await residentService.findById(req.params.id);
      sendSuccess(res, resident);
    } catch (error) { next(error); }
  }

  async update(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const resident = await residentService.update(req.params.id, req.body);
      sendSuccess(res, resident, 'Resident updated');
    } catch (error) { next(error); }
  }

  async markKyc(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { physicalLocation, notes } = req.body;
      const resident = await residentService.markKycVerified(req.params.id, { physicalLocation, notes }, req.user!.userId);
      await auditService.log({
        societyId: resident.societyId.toString(),
        actorUserId: req.user!.userId,
        actorRole: req.user!.roleCode,
        moduleCode: 'CORE',
        action: 'UPDATE',
        entityType: 'Resident',
        entityId: resident._id!.toString(),
        newValue: { kycStatus: 'VERIFIED', kycPhysicalLocation: physicalLocation },
        ipAddress: req.ip,
      });
      sendSuccess(res, resident, 'KYC marked as verified');
    } catch (error) { next(error); }
  }

  async disable(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      await residentService.disable(req.params.id);
      sendSuccess(res, null, 'Resident disabled');
    } catch (error) { next(error); }
  }
}

export const residentController = new ResidentController();
