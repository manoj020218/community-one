import { Resident } from '../resident/resident.model';
import { IMcrPaymentRecordDocument } from './mcrPaymentRecord.model';
import { IMcrReceiptDocument, McrReceipt } from './mcrReceipt.model';
import { mcrNumberingService } from './mcrNumbering.service';
import { mcrReceiptPublicService } from './mcrReceiptPublic.service';

interface ReceiptAllocationInput {
  demandId: string;
  demandNumber: string;
  allocatedAmountPaise: number;
}

export class McrReceiptService {
  async issueForPayment(input: {
    societyId: string;
    payment: IMcrPaymentRecordDocument;
    allocations: ReceiptAllocationInput[];
    advanceAmountPaise: number;
    issuedBy: string;
    issuedAt: Date;
  }): Promise<IMcrReceiptDocument> {
    const existing = await McrReceipt.findOne({
      societyId: input.societyId,
      paymentId: input.payment._id,
      status: 'ISSUED',
    });
    if (existing) return existing;

    const resident = input.payment.residentId
      ? await Resident.findOne({ _id: input.payment.residentId, societyId: input.societyId })
      : null;
    const receiptNumber = await mcrNumberingService.nextReceiptNumber(input.societyId, input.issuedAt);
    const receipt = await McrReceipt.create({
      societyId: input.societyId,
      receiptNumber,
      paymentId: input.payment._id,
      flatId: input.payment.flatId,
      residentId: input.payment.residentId,
      residentSnapshot: {
        name: resident?.name || input.payment.payerName,
        mobile: resident?.mobile || input.payment.payerMobile,
        email: resident?.email,
      },
      paymentSnapshot: {
        payerName: input.payment.payerName,
        paymentMethod: input.payment.paymentMethod,
        paymentDate: input.payment.paymentDate,
        amountPaise: input.payment.amountPaise,
      },
      allocationSnapshot: input.allocations,
      amountPaise: input.payment.amountPaise,
      advanceAmountPaise: input.advanceAmountPaise,
      issuedAt: input.issuedAt,
      issuedBy: input.issuedBy,
      status: 'ISSUED',
    });
    await mcrReceiptPublicService.buildShareInfo(receipt, '/api/mcr/public/receipts/verify', '/api/mcr/public/receipts/document');
    return receipt;
  }

  async issueReplacementReceipt(
    replacedReceipt: IMcrReceiptDocument,
    payment: IMcrPaymentRecordDocument,
    issuedBy: string,
    issuedAt: Date
  ): Promise<IMcrReceiptDocument> {
    const receiptNumber = await mcrNumberingService.nextReceiptNumber(replacedReceipt.societyId.toString(), issuedAt);
    const receipt = await McrReceipt.create({
      societyId: replacedReceipt.societyId,
      receiptNumber,
      paymentId: replacedReceipt.paymentId,
      flatId: replacedReceipt.flatId,
      residentId: payment.residentId,
      residentSnapshot: replacedReceipt.residentSnapshot,
      paymentSnapshot: replacedReceipt.paymentSnapshot,
      allocationSnapshot: replacedReceipt.allocationSnapshot,
      amountPaise: replacedReceipt.amountPaise,
      advanceAmountPaise: replacedReceipt.advanceAmountPaise,
      issuedAt,
      issuedBy,
      status: 'ISSUED',
      templateVersion: replacedReceipt.templateVersion,
    });
    await mcrReceiptPublicService.buildShareInfo(receipt, '/api/mcr/public/receipts/verify', '/api/mcr/public/receipts/document');
    return receipt;
  }
}

export const mcrReceiptService = new McrReceiptService();
