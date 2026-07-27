import { ConflictError } from '../../common/errors/AppError';
import { calculateRunningBalance } from './mcr.money';
import { LedgerEntry, ILedgerEntryDocument } from './ledger.model';
import { mcrNumberingService } from './mcrNumbering.service';

interface PostLedgerEntryInput {
  societyId: string;
  flatId: string;
  residentId?: string;
  entryType: string;
  sourceType: string;
  sourceId: string;
  debitPaise?: number;
  creditPaise?: number;
  entryDate: Date;
  createdBy: string;
  description: string;
  reversalOfEntryId?: string;
}

export class LedgerService {
  async postEntry(input: PostLedgerEntryInput): Promise<ILedgerEntryDocument> {
    const previous = await LedgerEntry.findOne({ societyId: input.societyId, flatId: input.flatId })
      .sort({ entryDate: -1, createdAt: -1 });
    const entryNumber = await mcrNumberingService.nextLedgerEntryNumber(input.societyId, input.entryDate);
    const debitPaise = input.debitPaise || 0;
    const creditPaise = input.creditPaise || 0;

    return LedgerEntry.create({
      ...input,
      debitPaise,
      creditPaise,
      entryNumber,
      runningBalancePaise: calculateRunningBalance(previous?.runningBalancePaise || 0, debitPaise, creditPaise),
    });
  }

  async postDemandEntry(input: {
    societyId: string;
    flatId: string;
    sourceId: string;
    amountPaise: number;
    entryDate: Date;
    createdBy: string;
    description: string;
  }): Promise<ILedgerEntryDocument> {
    const existing = await LedgerEntry.findOne({
      societyId: input.societyId,
      sourceType: 'MaintenanceDemand',
      sourceId: input.sourceId,
    });

    if (existing) {
      throw new ConflictError('Ledger entry already exists for this demand');
    }

    return this.postEntry({
      societyId: input.societyId,
      flatId: input.flatId,
      entryDate: input.entryDate,
      entryType: 'DEMAND',
      sourceType: 'MaintenanceDemand',
      sourceId: input.sourceId,
      debitPaise: input.amountPaise,
      description: input.description,
      createdBy: input.createdBy,
    });
  }

  async postPaymentEntry(input: {
    societyId: string;
    flatId: string;
    residentId?: string;
    sourceId: string;
    amountPaise: number;
    entryDate: Date;
    createdBy: string;
    description: string;
  }): Promise<ILedgerEntryDocument> {
    const existing = await LedgerEntry.findOne({
      societyId: input.societyId,
      sourceType: 'PAYMENT',
      sourceId: input.sourceId,
    });

    if (existing) {
      throw new ConflictError('Ledger entry already exists for this payment');
    }

    return this.postEntry({
      societyId: input.societyId,
      flatId: input.flatId,
      residentId: input.residentId,
      entryDate: input.entryDate,
      entryType: 'PAYMENT',
      sourceType: 'PAYMENT',
      sourceId: input.sourceId,
      creditPaise: input.amountPaise,
      description: input.description,
      createdBy: input.createdBy,
    });
  }

  async reverseEntry(
    entryId: string,
    createdBy: string,
    description: string,
    entryDate: Date
  ): Promise<ILedgerEntryDocument> {
    const entry = await LedgerEntry.findById(entryId).orFail();
    return this.postEntry({
      societyId: entry.societyId.toString(),
      flatId: entry.flatId.toString(),
      residentId: entry.residentId?.toString(),
      entryType: 'REVERSAL',
      sourceType: entry.sourceType,
      sourceId: entry.sourceId,
      debitPaise: entry.creditPaise,
      creditPaise: entry.debitPaise,
      entryDate,
      createdBy,
      description,
      reversalOfEntryId: entry._id.toString(),
    });
  }
}

export const ledgerService = new LedgerService();
