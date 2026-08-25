import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../../common/types';
import { residentService, ResidentSortField } from './resident.service';
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
      const validSorts: ResidentSortField[] = ['flatNo', 'name', 'memberType', 'kycStatus'];
      const sortBy = validSorts.includes(req.query.sortBy as ResidentSortField) ? (req.query.sortBy as ResidentSortField) : 'flatNo';
      const sortDir = req.query.sortDir === 'desc' ? -1 : 1;
      const towerId = typeof req.query.towerId === 'string' ? req.query.towerId : undefined;
      const result = await residentService.findBySociety(req.params.societyId, page, limit, req.query.search as string, sortBy, sortDir, towerId);
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
      const resident = await residentService.update(req.params.id, req.body, req.user!.userId);
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

  async grantLogin(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await residentService.grantLogin(req.params.id, req.user!.societyId!, req.body.password);
      await auditService.log({
        societyId: result.resident.societyId.toString(),
        actorUserId: req.user!.userId,
        actorRole: req.user!.roleCode,
        moduleCode: 'CORE',
        action: 'CREATE',
        entityType: 'User',
        entityId: result.user._id!.toString(),
        newValue: { grantedForResidentId: result.resident._id!.toString(), roleCode: result.user.roleCode },
        ipAddress: req.ip,
      });
      const { passwordHash, refreshToken, ...safeUser } = (result.user as any).toObject();
      sendCreated(res, { user: safeUser, resident: result.resident }, 'Login granted');
    } catch (error) { next(error); }
  }
}

export const residentController = new ResidentController();
