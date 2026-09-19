import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../../common/types';
import { joinRequestService } from './joinRequest.service';
import { sendSuccess, sendCreated, parsePagination, sendPaginated } from '../../common/utils/response';
import { auditService } from '../audit/audit.service';

export class JoinRequestController {
  async lookupSociety(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await joinRequestService.lookupSociety(req.body.code);
      sendSuccess(res, result);
    } catch (error) { next(error); }
  }

  async submit(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const joinRequest = await joinRequestService.submit(req.body);
      sendCreated(res, { _id: joinRequest._id, status: joinRequest.status }, 'Request submitted — your society admin will review it');
    } catch (error) { next(error); }
  }

  async findBySociety(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { page, limit } = parsePagination(req.query);
      const result = await joinRequestService.findBySocietyPaginated(req.params.societyId, req.query.status as string, page, limit);
      sendPaginated(res, result);
    } catch (error) { next(error); }
  }

  async approve(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const joinRequest = await joinRequestService.approve(req.params.id, req.user!.societyId!, req.user!.userId, req.body);
      await auditService.log({
        societyId: req.user!.societyId!,
        actorUserId: req.user!.userId,
        actorRole: req.user!.roleCode,
        moduleCode: 'CORE',
        action: 'CREATE',
        entityType: 'JoinRequest',
        entityId: joinRequest._id!.toString(),
        newValue: { status: 'APPROVED', resultingResidentId: joinRequest.resultingResidentId, resultingUserId: joinRequest.resultingUserId },
        ipAddress: req.ip,
      });
      sendSuccess(res, joinRequest, 'Join request approved');
    } catch (error) { next(error); }
  }

  async reject(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const joinRequest = await joinRequestService.reject(req.params.id, req.user!.societyId!, req.user!.userId, req.body);
      await auditService.log({
        societyId: req.user!.societyId!,
        actorUserId: req.user!.userId,
        actorRole: req.user!.roleCode,
        moduleCode: 'CORE',
        action: 'UPDATE',
        entityType: 'JoinRequest',
        entityId: joinRequest._id!.toString(),
        newValue: { status: 'REJECTED', reason: joinRequest.rejectionReason },
        ipAddress: req.ip,
      });
      sendSuccess(res, joinRequest, 'Join request rejected');
    } catch (error) { next(error); }
  }
}

export const joinRequestController = new JoinRequestController();
