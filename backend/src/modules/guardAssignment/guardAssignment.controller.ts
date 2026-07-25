import { NextFunction, Response } from 'express';
import { AuthenticatedRequest } from '../../common/types';
import { sendCreated, sendSuccess } from '../../common/utils/response';
import { resolveActorSocietyId } from '../../common/utils/authScope';
import { auditService } from '../audit/audit.service';
import { guardAssignmentService } from './guardAssignment.service';

export class GuardAssignmentController {
  async create(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const societyId = resolveActorSocietyId(req.user!, req.body.societyId);
      const assignment = await guardAssignmentService.create({ ...req.body, societyId }, req.user!.userId);
      await auditService.log({ societyId, actorUserId: req.user!.userId, actorRole: req.user!.roleCode, moduleCode: 'VISITOR', action: 'GUARD_ASSIGNMENT_CREATED', entityType: 'GuardAssignment', entityId: assignment._id!.toString(), newValue: { userId: assignment.userId, gateIds: assignment.gateIds }, ipAddress: req.ip });
      sendCreated(res, assignment, 'Guard assignment created');
    } catch (error) { next(error); }
  }

  async findBySociety(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const societyId = resolveActorSocietyId(req.user!, req.params.societyId, req.query.societyId as string);
      sendSuccess(res, await guardAssignmentService.findBySociety(societyId), 'Guard assignments retrieved');
    } catch (error) { next(error); }
  }

  async myAssignments(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const societyId = resolveActorSocietyId(req.user!, req.query.societyId as string);
      sendSuccess(res, await guardAssignmentService.findActiveForUser(societyId, req.user!.userId), 'Guard assignments retrieved');
    } catch (error) { next(error); }
  }

  async update(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      sendSuccess(res, await guardAssignmentService.update(req.params.id, req.body), 'Guard assignment updated');
    } catch (error) { next(error); }
  }

  async disable(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      await guardAssignmentService.disable(req.params.id);
      sendSuccess(res, null, 'Guard assignment disabled');
    } catch (error) { next(error); }
  }
}

export const guardAssignmentController = new GuardAssignmentController();
