import { NextFunction, Response } from 'express';
import { AuthenticatedRequest } from '../../common/types';
import { assertSocietyAccess } from '../../common/utils/authScope';
import { parsePagination, sendCreated, sendPaginated, sendSuccess } from '../../common/utils/response';
import { leaseService } from './lease.service';
import {
  createLeaseSchema,
  leaseStatusSchema,
  parseLeaseInput,
  renewLeaseSchema,
  terminateLeaseSchema,
  updateLeaseSchema,
} from './lease.validator';

export class LeaseController {
  async listBySociety(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      assertSocietyAccess(req.user!, req.params.societyId);
      const { page, limit } = parsePagination(req.query);
      const status = typeof req.query.status === 'string' ? parseLeaseInput(leaseStatusSchema, req.query.status) : undefined;
      const result = await leaseService.listBySociety(req.params.societyId, page, limit, status);
      sendPaginated(res, result, 'Leases retrieved');
    } catch (error) {
      next(error);
    }
  }

  async create(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const dto = parseLeaseInput(createLeaseSchema, req.body);
      assertSocietyAccess(req.user!, dto.societyId);
      const lease = await leaseService.create(dto, req.user!.userId);
      sendCreated(res, lease, 'Lease created');
    } catch (error) {
      next(error);
    }
  }

  async findById(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const lease = await leaseService.findById(req.params.id);
      assertSocietyAccess(req.user!, lease.societyId.toString());
      sendSuccess(res, lease, 'Lease retrieved');
    } catch (error) {
      next(error);
    }
  }

  async update(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const existing = await leaseService.findById(req.params.id);
      assertSocietyAccess(req.user!, existing.societyId.toString());
      const dto = parseLeaseInput(updateLeaseSchema, req.body);
      const lease = await leaseService.update(req.params.id, dto);
      sendSuccess(res, lease, 'Lease updated');
    } catch (error) {
      next(error);
    }
  }

  async renew(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const existing = await leaseService.findById(req.params.id);
      assertSocietyAccess(req.user!, existing.societyId.toString());
      const dto = parseLeaseInput(renewLeaseSchema, req.body);
      const lease = await leaseService.renew(req.params.id, dto);
      sendSuccess(res, lease, 'Lease renewed');
    } catch (error) {
      next(error);
    }
  }

  async terminate(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const existing = await leaseService.findById(req.params.id);
      assertSocietyAccess(req.user!, existing.societyId.toString());
      const dto = parseLeaseInput(terminateLeaseSchema, req.body);
      const lease = await leaseService.terminate(req.params.id, dto);
      sendSuccess(res, lease, 'Lease terminated');
    } catch (error) {
      next(error);
    }
  }
}

export const leaseController = new LeaseController();
