import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../../common/types';
import { sendSuccess, sendCreated } from '../../common/utils/response';
import { guardPatrolAccessService } from './guardPatrol.access.service';
import { patrolRoundService } from './patrolRound.service';
import { auditService } from '../audit/audit.service';

export class PatrolRoundController {
  async start(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const context = await guardPatrolAccessService.getActorContext(req.user!, req.query.societyId as string || req.body.societyId);
      const round = await patrolRoundService.startRound(context.societyId, req.user!.userId, req.body.routeId);
      await auditService.log({ societyId: context.societyId, actorUserId: req.user!.userId, actorRole: req.user!.roleCode, moduleCode: 'GUARD_PATROL', action: 'CREATE', entityType: 'PatrolRound', entityId: round._id!.toString(), newValue: { routeId: round.routeId }, ipAddress: req.ip || '' });
      sendCreated(res, round, 'Round started');
    } catch (error) { next(error); }
  }

  async myActive(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const context = await guardPatrolAccessService.getActorContext(req.user!, req.query.societyId as string);
      sendSuccess(res, await patrolRoundService.findActiveForGuard(context.societyId, req.user!.userId));
    } catch (error) { next(error); }
  }

  async progress(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const context = await guardPatrolAccessService.getActorContext(req.user!, req.query.societyId as string);
      sendSuccess(res, await patrolRoundService.getProgress(context.societyId, req.params.id, req.user!.userId));
    } catch (error) { next(error); }
  }

  async scan(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const context = await guardPatrolAccessService.getActorContext(req.user!, req.query.societyId as string || req.body.societyId);
      const scan = await patrolRoundService.scanCheckpoint(context.societyId, req.params.id, req.user!.userId, req.body);
      sendCreated(res, scan, scan.status === 'HIT' ? 'Checkpoint scanned' : 'Checkpoint scanned (late)');
    } catch (error) { next(error); }
  }

  async end(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const context = await guardPatrolAccessService.getActorContext(req.user!, req.query.societyId as string);
      const round = await patrolRoundService.endRound(context.societyId, req.params.id, req.user!.userId);
      await auditService.log({ societyId: context.societyId, actorUserId: req.user!.userId, actorRole: req.user!.roleCode, moduleCode: 'GUARD_PATROL', action: 'UPDATE', entityType: 'PatrolRound', entityId: round._id!.toString(), newValue: { status: round.status }, ipAddress: req.ip || '' });
      sendSuccess(res, round, 'Round ended');
    } catch (error) { next(error); }
  }
}

export const patrolRoundController = new PatrolRoundController();
