import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../../common/types';
import { sendSuccess, sendCreated } from '../../common/utils/response';
import { guardPatrolAccessService } from './guardPatrol.access.service';
import { patrolRouteService } from './patrolRoute.service';
import { auditService } from '../audit/audit.service';

export class PatrolRouteController {
  async create(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const context = await guardPatrolAccessService.getActorContext(req.user!, req.query.societyId as string || req.body.societyId);
      const route = await patrolRouteService.create(context.societyId, req.body, req.user!.userId);
      await auditService.log({ societyId: context.societyId, actorUserId: req.user!.userId, actorRole: req.user!.roleCode, moduleCode: 'GUARD_PATROL', action: 'CREATE', entityType: 'PatrolRoute', entityId: route._id!.toString(), newValue: { name: route.name, checkpointCount: route.checkpointIds.length }, ipAddress: req.ip || '' });
      sendCreated(res, route, 'Route created');
    } catch (error) { next(error); }
  }

  async findBySociety(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const context = await guardPatrolAccessService.getActorContext(req.user!, req.query.societyId as string);
      sendSuccess(res, await patrolRouteService.findBySociety(context.societyId), 'Routes retrieved');
    } catch (error) { next(error); }
  }

  async findById(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      await guardPatrolAccessService.getActorContext(req.user!, req.query.societyId as string);
      sendSuccess(res, await patrolRouteService.findById(req.params.id));
    } catch (error) { next(error); }
  }

  async update(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const context = await guardPatrolAccessService.getActorContext(req.user!, req.query.societyId as string);
      sendSuccess(res, await patrolRouteService.update(req.params.id, context.societyId, req.body), 'Route updated');
    } catch (error) { next(error); }
  }

  async disable(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      await guardPatrolAccessService.getActorContext(req.user!, req.query.societyId as string);
      await patrolRouteService.disable(req.params.id);
      sendSuccess(res, null, 'Route disabled');
    } catch (error) { next(error); }
  }
}

export const patrolRouteController = new PatrolRouteController();
