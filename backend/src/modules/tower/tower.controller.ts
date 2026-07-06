import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../../common/types';
import { towerService } from './tower.service';
import { sendSuccess, sendCreated } from '../../common/utils/response';
import { auditService } from '../audit/audit.service';

export class TowerController {
  async create(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const tower = await towerService.create(req.body, req.user!.userId);
      await auditService.log({
        societyId: req.body.societyId,
        actorUserId: req.user!.userId, actorRole: req.user!.roleCode,
        moduleCode: 'CORE', action: 'CREATE', entityType: 'Tower',
        entityId: tower._id!.toString(), newValue: { name: tower.name }, ipAddress: req.ip,
      });
      sendCreated(res, tower, 'Tower created');
    } catch (error) { next(error); }
  }

  async generate(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const towers = await towerService.generateTowers(req.body, req.user!.userId);
      sendCreated(res, towers, `${towers.length} towers generated`);
    } catch (error) { next(error); }
  }

  async findBySociety(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const towers = await towerService.findBySociety(req.params.societyId);
      sendSuccess(res, towers, 'Towers retrieved');
    } catch (error) { next(error); }
  }

  async findById(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const tower = await towerService.findById(req.params.id);
      sendSuccess(res, tower);
    } catch (error) { next(error); }
  }

  async update(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const tower = await towerService.update(req.params.id, req.body);
      sendSuccess(res, tower, 'Tower updated');
    } catch (error) { next(error); }
  }

  async delete(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      await towerService.delete(req.params.id);
      sendSuccess(res, null, 'Tower deleted');
    } catch (error) { next(error); }
  }
}

export const towerController = new TowerController();
