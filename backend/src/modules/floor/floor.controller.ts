import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../../common/types';
import { floorService } from './floor.service';
import { sendSuccess, sendCreated } from '../../common/utils/response';

export class FloorController {
  async create(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const floor = await floorService.create(req.body, req.user!.userId);
      sendCreated(res, floor, 'Floor created');
    } catch (error) { next(error); }
  }

  async generate(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const floors = await floorService.generateFloors(req.body, req.user!.userId);
      sendCreated(res, floors, `${floors.length} floors generated`);
    } catch (error) { next(error); }
  }

  async findByTower(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const floors = await floorService.findByTower(req.params.towerId);
      sendSuccess(res, floors, 'Floors retrieved');
    } catch (error) { next(error); }
  }

  async findBySociety(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const floors = await floorService.findBySociety(req.params.societyId);
      sendSuccess(res, floors, 'Floors retrieved');
    } catch (error) { next(error); }
  }

  async update(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const floor = await floorService.update(req.params.id, req.body);
      sendSuccess(res, floor, 'Floor updated');
    } catch (error) { next(error); }
  }

  async delete(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      await floorService.delete(req.params.id);
      sendSuccess(res, null, 'Floor deleted');
    } catch (error) { next(error); }
  }
}

export const floorController = new FloorController();
