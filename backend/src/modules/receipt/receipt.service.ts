import { v4 as uuidv4 } from 'uuid';
import { Receipt, ReceiptCounter, IReceiptDocument } from './receipt.model';
import { Society } from '../society/society.model';
import { NotFoundError } from '../../common/errors/AppError';
import { buildPaginatedResult } from '../../common/utils/response';
import { PaginatedResult } from '../../common/types';

export interface GenerateReceiptDto {
  societyId: string;
  paymentRecordId: string;
  flatId: string;
  memberId?: string;
  amount: number;
  purpose: string;
  paymentMode: string;
  receiptDate?: string;
}

async function getNextReceiptNumber(societyId: string, societyCode: string): Promise<string> {
  const year = new Date().getFullYear();
  const counter = await ReceiptCounter.findOneAndUpdate(
    { societyId, year },
    { $inc: { count: 1 } },
    { upsert: true, new: true }
  );
  const prefix = societyCode.replace('JSO-', '').substring(0, 3);
  return `${prefix}/${year}/${String(counter.count).padStart(6, '0')}`;
}

export class ReceiptService {
  async generate(dto: GenerateReceiptDto, generatedBy: string): Promise<IReceiptDocument> {
    const society = await Society.findById(dto.societyId);
    if (!society) throw new NotFoundError('Society');

    const receiptNo = await getNextReceiptNumber(dto.societyId, society.code);
    const verificationCode = uuidv4().substring(0, 8).toUpperCase();

    return Receipt.create({
      ...dto,
      receiptNo,
      generatedBy,
      verificationCode,
      // PDF generation placeholder — pdfUrl will be set when PDF service is integrated
    });
  }

  async findBySociety(societyId: string, page: number, limit: number): Promise<PaginatedResult<IReceiptDocument>> {
    const query = { societyId };
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      Receipt.find(query).populate('flatId', 'flatNo').populate('memberId', 'name').sort({ receiptDate: -1 }).skip(skip).limit(limit),
      Receipt.countDocuments(query),
    ]);
    return buildPaginatedResult(items, total, page, limit);
  }

  async findById(id: string): Promise<IReceiptDocument> {
    const receipt = await Receipt.findById(id);
    if (!receipt) throw new NotFoundError('Receipt');
    return receipt;
  }

  async findByReceiptNo(receiptNo: string, societyId: string): Promise<IReceiptDocument | null> {
    return Receipt.findOne({ receiptNo, societyId });
  }
}

export const receiptService = new ReceiptService();
