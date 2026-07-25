import fs from 'fs';
import path from 'path';
import { NextFunction, Response } from 'express';
import { AuthenticatedRequest } from '../../common/types';
import { NotFoundError } from '../../common/errors/AppError';
import { parsePagination, sendCreated, sendPaginated, sendSuccess } from '../../common/utils/response';
import { FileAsset } from '../fileAsset/fileAsset.model';
import { fileAssetService } from '../fileAsset/fileAsset.service';
import { visitorAccessService } from './visitor.access.service';
import { visitorActionService } from './visitor.action.service';
import { visitorQueryService } from './visitor.query.service';

export class VisitorRequestController {
  async list(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const context = await visitorAccessService.getActorContext(req.user!, req.query.societyId as string);
      const { page, limit } = parsePagination(req.query);
      sendPaginated(res, await visitorQueryService.listRequests(context, req.query as Record<string, string | undefined>, page, limit), 'Visitor requests retrieved');
    } catch (error) { next(error); }
  }

  async get(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const context = await visitorAccessService.getActorContext(req.user!, req.query.societyId as string);
      const request = await visitorQueryService.getRequest(context, req.params.requestId);
      await visitorQueryService.auditView(context, request);
      sendSuccess(res, request, 'Visitor request retrieved');
    } catch (error) { next(error); }
  }

  async getPhoto(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const context = await visitorAccessService.getActorContext(req.user!, req.query.societyId as string);
      // Reuses the same tenant/flat/gate scoping as getRequest — throws NotFoundError if out of scope.
      const request = await visitorQueryService.getRequest(context, req.params.requestId);
      const photoRef = request.visitorPhotoFileId as unknown;
      const fileId = typeof photoRef === 'string' ? photoRef : (photoRef as { _id?: string })?._id;
      if (!fileId) throw new NotFoundError('Visitor photo');

      const file = await FileAsset.findOne({ _id: fileId, societyId: context.societyId, isActive: true });
      if (!file) throw new NotFoundError('Visitor photo');

      const filePath = path.join(fileAssetService.getUploadPath(), file.fileName);
      if (!fs.existsSync(filePath)) throw new NotFoundError('Visitor photo file');

      res.setHeader('Content-Type', file.mimeType);
      res.setHeader('Cache-Control', 'private, max-age=0, no-store');
      fs.createReadStream(filePath).pipe(res);
    } catch (error) { next(error); }
  }

  async create(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const context = await visitorAccessService.getActorContext(req.user!, req.body.societyId);
      sendCreated(res, await visitorActionService.create(context, req.body), 'Visitor request created');
    } catch (error) { next(error); }
  }

  async approve(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const context = await visitorAccessService.getActorContext(req.user!, req.body.societyId);
      sendSuccess(res, await visitorActionService.approve(context, req.params.requestId, req.body.approvalNote), 'Visitor request approved');
    } catch (error) { next(error); }
  }

  async reject(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const context = await visitorAccessService.getActorContext(req.user!, req.body.societyId);
      sendSuccess(res, await visitorActionService.reject(context, req.params.requestId, req.body.rejectionReason), 'Visitor request rejected');
    } catch (error) { next(error); }
  }

  async cancel(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const context = await visitorAccessService.getActorContext(req.user!, req.body.societyId);
      sendSuccess(res, await visitorActionService.cancel(context, req.params.requestId, req.body.reason), 'Visitor request cancelled');
    } catch (error) { next(error); }
  }

  async confirmEntry(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const context = await visitorAccessService.getActorContext(req.user!, req.body.societyId);
      sendSuccess(res, await visitorActionService.confirmEntry(context, req.params.requestId), 'Visitor entry confirmed');
    } catch (error) { next(error); }
  }

  async confirmExit(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const context = await visitorAccessService.getActorContext(req.user!, req.body.societyId);
      sendSuccess(res, await visitorActionService.confirmExit(context, req.params.requestId), 'Visitor exit confirmed');
    } catch (error) { next(error); }
  }
}

export const visitorRequestController = new VisitorRequestController();
