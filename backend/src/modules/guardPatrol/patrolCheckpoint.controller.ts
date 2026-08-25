import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../../common/types';
import { sendSuccess, sendCreated } from '../../common/utils/response';
import { guardPatrolAccessService } from './guardPatrol.access.service';
import { patrolCheckpointService } from './patrolCheckpoint.service';
import { guardPatrolQrService } from './guardPatrolQr.service';
import { auditService } from '../audit/audit.service';

export class PatrolCheckpointController {
  async create(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const context = await guardPatrolAccessService.getActorContext(req.user!, req.query.societyId as string || req.body.societyId);
      const checkpoint = await patrolCheckpointService.create(context.societyId, req.body, req.user!.userId);
      await auditService.log({ societyId: context.societyId, actorUserId: req.user!.userId, actorRole: req.user!.roleCode, moduleCode: 'GUARD_PATROL', action: 'CREATE', entityType: 'PatrolCheckpoint', entityId: checkpoint._id!.toString(), newValue: { name: checkpoint.name, method: checkpoint.method }, ipAddress: req.ip || '' });
      sendCreated(res, checkpoint, 'Checkpoint created');
    } catch (error) { next(error); }
  }

  async findBySociety(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const context = await guardPatrolAccessService.getActorContext(req.user!, req.query.societyId as string);
      sendSuccess(res, await patrolCheckpointService.findBySociety(context.societyId), 'Checkpoints retrieved');
    } catch (error) { next(error); }
  }

  async update(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      await guardPatrolAccessService.getActorContext(req.user!, req.query.societyId as string);
      sendSuccess(res, await patrolCheckpointService.update(req.params.id, req.body), 'Checkpoint updated');
    } catch (error) { next(error); }
  }

  async disable(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      await guardPatrolAccessService.getActorContext(req.user!, req.query.societyId as string);
      await patrolCheckpointService.disable(req.params.id);
      sendSuccess(res, null, 'Checkpoint disabled');
    } catch (error) { next(error); }
  }

  async sticker(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const context = await guardPatrolAccessService.getActorContext(req.user!, req.query.societyId as string);
      const sticker = await guardPatrolQrService.buildCheckpointSticker(context.societyId, req.params.id);
      res.type('image/svg+xml').send(sticker.svg);
    } catch (error) { next(error); }
  }
}

export const patrolCheckpointController = new PatrolCheckpointController();
