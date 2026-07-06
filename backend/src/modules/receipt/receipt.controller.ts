import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../../common/types';
import { receiptService } from './receipt.service';
import { sendSuccess, sendCreated, sendPaginated, parsePagination } from '../../common/utils/response';
import { auditService } from '../audit/audit.service';

export class ReceiptController {
  async generate(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const receipt = await receiptService.generate(req.body, req.user!.userId);
      await auditService.log({ societyId: req.body.societyId, actorUserId: req.user!.userId, actorRole: req.user!.roleCode, moduleCode: 'CORE', action: 'RECEIPT_GENERATED', entityType: 'Receipt', entityId: receipt._id!.toString(), newValue: { receiptNo: receipt.receiptNo }, ipAddress: req.ip });
      sendCreated(res, receipt, `Receipt ${receipt.receiptNo} generated`);
    } catch (error) { next(error); }
  }

  async findBySociety(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { page, limit } = parsePagination(req.query);
      const result = await receiptService.findBySociety(req.params.societyId, page, limit);
      sendPaginated(res, result, 'Receipts retrieved');
    } catch (error) { next(error); }
  }

  async findById(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const receipt = await receiptService.findById(req.params.id);
      sendSuccess(res, receipt);
    } catch (error) { next(error); }
  }
}

export const receiptController = new ReceiptController();
