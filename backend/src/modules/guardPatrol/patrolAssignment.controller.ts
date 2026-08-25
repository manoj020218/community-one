import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../../common/types';
import { sendSuccess, sendCreated } from '../../common/utils/response';
import { guardPatrolAccessService } from './guardPatrol.access.service';
import { patrolAssignmentService } from './patrolAssignment.service';
import { auditService } from '../audit/audit.service';

export class PatrolAssignmentController {
  async create(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const context = await guardPatrolAccessService.getActorContext(req.user!, req.query.societyId as string || req.body.societyId);
      const assignment = await patrolAssignmentService.create(context.societyId, req.body, req.user!.userId);
      await auditService.log({ societyId: context.societyId, actorUserId: req.user!.userId, actorRole: req.user!.roleCode, moduleCode: 'GUARD_PATROL', action: 'CREATE', entityType: 'PatrolAssignment', entityId: assignment._id!.toString(), newValue: { userId: assignment.userId, routeId: assignment.routeId }, ipAddress: req.ip || '' });
      sendCreated(res, assignment, 'Assignment created');
    } catch (error) { next(error); }
  }

  async findBySociety(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const context = await guardPatrolAccessService.getActorContext(req.user!, req.query.societyId as string);
      sendSuccess(res, await patrolAssignmentService.findBySociety(context.societyId), 'Assignments retrieved');
    } catch (error) { next(error); }
  }

  async findMine(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const context = await guardPatrolAccessService.getActorContext(req.user!, req.query.societyId as string);
      sendSuccess(res, await patrolAssignmentService.findActiveForUser(context.societyId, req.user!.userId), 'Your assignments retrieved');
    } catch (error) { next(error); }
  }

  async update(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      await guardPatrolAccessService.getActorContext(req.user!, req.query.societyId as string);
      sendSuccess(res, await patrolAssignmentService.update(req.params.id, req.body), 'Assignment updated');
    } catch (error) { next(error); }
  }

  async disable(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      await guardPatrolAccessService.getActorContext(req.user!, req.query.societyId as string);
      await patrolAssignmentService.disable(req.params.id);
      sendSuccess(res, null, 'Assignment disabled');
    } catch (error) { next(error); }
  }
}

export const patrolAssignmentController = new PatrolAssignmentController();
