import { NextFunction, Response } from 'express';
import { AuthenticatedRequest } from '../../common/types';
import { sendSuccess } from '../../common/utils/response';
import { auditService } from '../audit/audit.service';
import { McrActorContext, mcrAccessService } from './mcr.access.service';
import { mcrDispatchService } from './mcrDispatch.service';
import { mcrReceiptDocumentService } from './mcrReceiptDocument.service';
import { mcrReceiptLifecycleService } from './mcrReceiptLifecycle.service';
import { mcrReceiptPosterService } from './mcrReceiptPoster.service';
import { mcrReceiptPublicService } from './mcrReceiptPublic.service';
import { mcrReceiptQueryService } from './mcrReceiptQuery.service';

function resolveContext(req: AuthenticatedRequest): Promise<McrActorContext> {
  const societyId = typeof req.body.societyId === 'string'
    ? req.body.societyId
    : typeof req.query.societyId === 'string'
      ? req.query.societyId
      : undefined;
  return mcrAccessService.getActorContext(req.user!, societyId);
}

function publicUrls(req: AuthenticatedRequest) {
  const root = `${req.protocol}://${req.get('host')}/api/mcr/public/receipts`;
  return { verifyBaseUrl: `${root}/verify`, documentBaseUrl: `${root}/document` };
}

export class McrReceiptController {
  async list(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const context = await resolveContext(req);
      sendSuccess(res, await mcrReceiptQueryService.listBySociety(context.societyId, req.query.status as string | undefined), 'MCR receipts retrieved');
    } catch (error) { next(error); }
  }

  async getById(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const context = await resolveContext(req);
      sendSuccess(res, await mcrReceiptQueryService.findById(context.societyId, req.params.receiptId), 'MCR receipt retrieved');
    } catch (error) { next(error); }
  }

  async getByPaymentId(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const context = await resolveContext(req);
      sendSuccess(res, await mcrReceiptQueryService.findByPaymentId(context.societyId, req.params.paymentId), 'MCR receipt retrieved for payment');
    } catch (error) { next(error); }
  }

  async document(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const context = await resolveContext(req);
      const urls = publicUrls(req);
      const doc = await mcrReceiptDocumentService.buildById(context.societyId, req.params.receiptId, urls.verifyBaseUrl, urls.documentBaseUrl);
      res.type('html').send(doc.html);
    } catch (error) { next(error); }
  }

  async download(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const context = await resolveContext(req);
      const urls = publicUrls(req);
      const doc = await mcrReceiptDocumentService.buildById(context.societyId, req.params.receiptId, urls.verifyBaseUrl, urls.documentBaseUrl);
      res.setHeader('Content-Disposition', `attachment; filename="${doc.fileName}"`);
      res.type('html').send(doc.html);
    } catch (error) { next(error); }
  }

  async poster(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const context = await resolveContext(req);
      const urls = publicUrls(req);
      const poster = await mcrReceiptPosterService.buildById(context.societyId, req.params.receiptId, urls.verifyBaseUrl, urls.documentBaseUrl);
      res.type('image/svg+xml').send(poster.svg);
    } catch (error) { next(error); }
  }

  async share(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const context = await resolveContext(req);
      const receipt = await mcrReceiptQueryService.findById(context.societyId, req.params.receiptId);
      sendSuccess(res, await mcrReceiptPublicService.buildShareInfo(receipt, publicUrls(req).verifyBaseUrl, publicUrls(req).documentBaseUrl), 'MCR receipt share links generated');
    } catch (error) { next(error); }
  }

  async void(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const context = await resolveContext(req);
      const receipt = await mcrReceiptLifecycleService.voidReceipt(context, req.params.receiptId, req.body);
      await auditService.log({ societyId: context.societyId, actorUserId: context.user.userId, actorRole: context.user.roleCode, moduleCode: 'MCR', action: 'MCR_RECEIPT_VOIDED', entityType: 'McrReceipt', entityId: receipt._id!.toString(), newValue: { receiptNumber: receipt.receiptNumber, status: receipt.status }, ipAddress: req.ip });
      sendSuccess(res, receipt, 'MCR receipt voided');
    } catch (error) { next(error); }
  }

  async replace(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const context = await resolveContext(req);
      const result = await mcrReceiptLifecycleService.replaceReceipt(context, req.params.receiptId, req.body);
      await auditService.log({ societyId: context.societyId, actorUserId: context.user.userId, actorRole: context.user.roleCode, moduleCode: 'MCR', action: 'MCR_RECEIPT_REPLACED', entityType: 'McrReceipt', entityId: result.receipt._id!.toString(), newValue: { replacedReceiptId: result.replacedReceipt._id!.toString(), receiptNumber: result.receipt.receiptNumber }, ipAddress: req.ip });
      sendSuccess(res, result, 'MCR receipt replaced');
    } catch (error) { next(error); }
  }

  async send(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const context = await resolveContext(req);
      const urls = publicUrls(req);
      const result = await mcrDispatchService.sendReceipt(context.societyId, req.params.receiptId, req.body, urls.verifyBaseUrl, urls.documentBaseUrl);
      await auditService.log({ societyId: context.societyId, actorUserId: context.user.userId, actorRole: context.user.roleCode, moduleCode: 'MCR', action: 'MCR_RECEIPT_SHARED', entityType: 'McrReceipt', entityId: req.params.receiptId, newValue: result, ipAddress: req.ip });
      sendSuccess(res, result, 'MCR receipt dispatch processed');
    } catch (error) { next(error); }
  }
}

export const mcrReceiptController = new McrReceiptController();
