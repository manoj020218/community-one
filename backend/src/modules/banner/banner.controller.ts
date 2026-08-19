import { NextFunction, Response } from 'express';
import { AuthenticatedRequest } from '../../common/types';
import { sendCreated, sendSuccess } from '../../common/utils/response';
import { auditService } from '../audit/audit.service';
import { bannerService } from './banner.service';

export class BannerController {
  async create(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const banner = await bannerService.create(req.body, req.user!.userId);
      await auditService.log({ actorUserId: req.user!.userId, actorRole: req.user!.roleCode, moduleCode: 'CORE', action: 'BANNER_CREATED', entityType: 'Banner', entityId: banner._id!.toString(), newValue: { message: banner.message, bannerType: banner.bannerType }, ipAddress: req.ip });
      sendCreated(res, banner, 'Banner created');
    } catch (error) { next(error); }
  }

  async list(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      sendSuccess(res, await bannerService.list(), 'Banners retrieved');
    } catch (error) { next(error); }
  }

  async listActive(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      sendSuccess(res, await bannerService.listActive(), 'Active banners retrieved');
    } catch (error) { next(error); }
  }

  async update(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      sendSuccess(res, await bannerService.update(req.params.id, req.body), 'Banner updated');
    } catch (error) { next(error); }
  }

  async disable(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      await bannerService.disable(req.params.id);
      sendSuccess(res, null, 'Banner disabled');
    } catch (error) { next(error); }
  }
}

export const bannerController = new BannerController();
