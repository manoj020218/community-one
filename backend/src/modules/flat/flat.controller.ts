import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../../common/types';
import { flatService } from './flat.service';
import { sendSuccess, sendCreated, sendPaginated, parsePagination } from '../../common/utils/response';

export class FlatController {
  async create(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const flat = await flatService.create(req.body, req.user!.userId);
      sendCreated(res, flat, 'Flat created');
    } catch (error) { next(error); }
  }

  async generate(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const flats = await flatService.generateFlats(req.body, req.user!.userId);
      sendCreated(res, flats, `${flats.length} flats generated`);
    } catch (error) { next(error); }
  }

  async findBySociety(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { page, limit } = parsePagination(req.query);
      const result = await flatService.findBySociety(req.params.societyId, page, limit);
      sendPaginated(res, result, 'Flats retrieved');
    } catch (error) { next(error); }
  }

  async findByFloor(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const flats = await flatService.findByFloor(req.params.floorId);
      sendSuccess(res, flats, 'Flats retrieved');
    } catch (error) { next(error); }
  }

  async findById(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const flat = await flatService.findById(req.params.id);
      sendSuccess(res, flat);
    } catch (error) { next(error); }
  }

  async update(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const flat = await flatService.update(req.params.id, req.body);
      sendSuccess(res, flat, 'Flat updated');
    } catch (error) { next(error); }
  }

  async delete(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      await flatService.delete(req.params.id);
      sendSuccess(res, null, 'Flat deleted');
    } catch (error) { next(error); }
  }

  async getStats(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const stats = await flatService.getStats(req.params.societyId);
      sendSuccess(res, stats, 'Stats retrieved');
    } catch (error) { next(error); }
  }
}

export const flatController = new FlatController();
