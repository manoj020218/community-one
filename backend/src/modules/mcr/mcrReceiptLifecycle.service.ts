import { ConflictError, NotFoundError } from '../../common/errors/AppError';
import { McrActorContext } from './mcr.access.service';
import { IMcrPaymentRecordDocument, McrPaymentRecord } from './mcrPaymentRecord.model';
import { receiptReplaceSchema, receiptVoidSchema } from './mcrReceipt.schemas';
import { IMcrReceiptDocument, McrReceipt } from './mcrReceipt.model';
import { mcrReceiptService } from './mcrReceipt.service';
import { parseOrThrow } from './mcr.validation';

export class McrReceiptLifecycleService {
  async voidReceipt(context: McrActorContext, receiptId: string, input: unknown) {
    const dto = parseOrThrow(receiptVoidSchema, input);
    const { receipt, payment } = await this.getReceiptAndPayment(context.societyId, receiptId);
    if (receipt.status !== 'ISSUED') throw new ConflictError('Only active receipts can be voided');
    if (payment?.status === 'VERIFIED' && payment.receiptId?.toString() === receipt._id!.toString()) {
      throw new ConflictError('Verified payments must retain an active receipt; replace the receipt or bounce the payment');
    }

    receipt.status = 'VOID';
    receipt.voidedAt = new Date();
    receipt.voidedBy = context.user.userId;
    receipt.voidReason = dto.reason;
    receipt.publicVerificationTokenHash = undefined;
    await receipt.save();
    return receipt;
  }

  async replaceReceipt(context: McrActorContext, receiptId: string, input: unknown) {
    const dto = parseOrThrow(receiptReplaceSchema, input);
    const { receipt, payment } = await this.getReceiptAndPayment(context.societyId, receiptId);
    if (receipt.status !== 'ISSUED') throw new ConflictError('Only active receipts can be replaced');
    if (!payment || payment.status !== 'VERIFIED') throw new ConflictError('Only verified-payment receipts can be replaced');

    const replacement = await mcrReceiptService.issueReplacementReceipt(receipt, payment, context.user.userId, new Date());
    receipt.status = 'REPLACED';
    receipt.voidedAt = new Date();
    receipt.voidedBy = context.user.userId;
    receipt.voidReason = dto.reason;
    receipt.replacementReceiptId = replacement._id!.toString();
    receipt.publicVerificationTokenHash = undefined;
    await receipt.save();
    payment.receiptId = replacement._id!.toString();
    await payment.save();
    return { replacedReceipt: receipt, receipt: replacement };
  }

  private async getReceiptAndPayment(societyId: string, receiptId: string): Promise<{ receipt: IMcrReceiptDocument; payment: IMcrPaymentRecordDocument | null }> {
    const receipt = await McrReceipt.findOne({ _id: receiptId, societyId });
    if (!receipt) throw new NotFoundError('MCR receipt');
    const payment = await McrPaymentRecord.findOne({ _id: receipt.paymentId, societyId });
    return { receipt, payment };
  }
}

export const mcrReceiptLifecycleService = new McrReceiptLifecycleService();
