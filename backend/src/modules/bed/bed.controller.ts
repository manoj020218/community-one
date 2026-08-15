import { NextFunction, Response } from 'express';
import { AuthenticatedRequest } from '../../common/types';
import { assertSocietyAccess } from '../../common/utils/authScope';
import { sendCreated, sendSuccess } from '../../common/utils/response';
import { bedService } from './bed.service';
import { assignBedSchema, createBedSchema, generateBedsSchema, parseBedInput, updateBedSchema } from './bed.validator';

export class BedController {
  async listByFlat(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const beds = await bedService.listByFlat(req.params.flatId);
      if (beds.length > 0) assertSocietyAccess(req.user!, beds[0].societyId.toString());
      sendSuccess(res, beds, 'Beds retrieved');
    } catch (error) {
      next(error);
    }
  }

  async create(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const dto = parseBedInput(createBedSchema, req.body);
      assertSocietyAccess(req.user!, dto.societyId);
      const bed = await bedService.create(dto, req.user!.userId);
      sendCreated(res, bed, 'Bed created');
    } catch (error) {
      next(error);
    }
  }

  async generate(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const dto = parseBedInput(generateBedsSchema, req.body);
      assertSocietyAccess(req.user!, dto.societyId);
      const beds = await bedService.generate(dto, req.user!.userId);
      sendCreated(res, beds, `${beds.length} beds generated`);
    } catch (error) {
      next(error);
    }
  }

  async update(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const existing = await bedService.findById(req.params.id);
      assertSocietyAccess(req.user!, existing.societyId.toString());
      const dto = parseBedInput(updateBedSchema, req.body);
      const bed = await bedService.update(req.params.id, dto);
      sendSuccess(res, bed, 'Bed updated');
    } catch (error) {
      next(error);
    }
  }

  async assign(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const existing = await bedService.findById(req.params.id);
      assertSocietyAccess(req.user!, existing.societyId.toString());
      const dto = parseBedInput(assignBedSchema, req.body);
      const bed = await bedService.assign(req.params.id, dto);
      sendSuccess(res, bed, 'Bed assigned');
    } catch (error) {
      next(error);
    }
  }

  async release(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const existing = await bedService.findById(req.params.id);
      assertSocietyAccess(req.user!, existing.societyId.toString());
      const bed = await bedService.release(req.params.id);
      sendSuccess(res, bed, 'Bed released');
    } catch (error) {
      next(error);
    }
  }

  async disable(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const existing = await bedService.findById(req.params.id);
      assertSocietyAccess(req.user!, existing.societyId.toString());
      await bedService.disable(req.params.id);
      sendSuccess(res, null, 'Bed disabled');
    } catch (error) {
      next(error);
    }
  }
}

export const bedController = new BedController();
