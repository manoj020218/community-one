import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../../common/types';
import { petService } from './pet.service';
import { sendSuccess, sendCreated, sendPaginated, parsePagination } from '../../common/utils/response';

export class PetController {
  async create(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const pet = await petService.create(req.body, req.user!.userId);
      sendCreated(res, pet, 'Pet registered');
    } catch (error) { next(error); }
  }

  async findBySociety(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { page, limit } = parsePagination(req.query);
      const result = await petService.findBySociety(req.params.societyId, page, limit);
      sendPaginated(res, result, 'Pets retrieved');
    } catch (error) { next(error); }
  }

  async findByFlat(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const pets = await petService.findByFlat(req.params.flatId);
      sendSuccess(res, pets, 'Pets retrieved');
    } catch (error) { next(error); }
  }

  async findById(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const pet = await petService.findById(req.params.id);
      sendSuccess(res, pet);
    } catch (error) { next(error); }
  }

  async update(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const pet = await petService.update(req.params.id, req.body);
      sendSuccess(res, pet, 'Pet updated');
    } catch (error) { next(error); }
  }

  async disable(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      await petService.disable(req.params.id);
      sendSuccess(res, null, 'Pet disabled');
    } catch (error) { next(error); }
  }
}

export const petController = new PetController();
