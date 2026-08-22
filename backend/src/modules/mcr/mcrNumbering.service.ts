import { McrSettings } from './mcrSettings.model';
import { buildDefaultMcrSettingsInput } from './mcrSettings.schemas';
import { sequenceCounterService } from './sequenceCounter.service';

export class McrNumberingService {
  async nextDemandNumber(societyId: string, dateOrPeriod: Date | string = new Date()): Promise<string> {
    const prefix = await this.getPrefix(societyId, 'demand');
    const periodKey = typeof dateOrPeriod === 'string'
      ? dateOrPeriod
      : `${dateOrPeriod.getUTCFullYear()}-${String(dateOrPeriod.getUTCMonth() + 1).padStart(2, '0')}`;
    const value = await sequenceCounterService.nextValue(societyId, 'DEMAND', periodKey);
    return `${prefix}/${periodKey}/${String(value).padStart(6, '0')}`;
  }

  async nextReceiptNumber(societyId: string, date: Date = new Date()): Promise<string> {
    const prefix = await this.getPrefix(societyId, 'receipt');
    const periodKey = String(date.getUTCFullYear());
    const value = await sequenceCounterService.nextValue(societyId, 'RECEIPT', periodKey);
    return `${prefix}/${periodKey}/${String(value).padStart(6, '0')}`;
  }

  async nextPaymentNumber(societyId: string, date: Date = new Date()): Promise<string> {
    return this.nextFixedPrefixNumber(societyId, 'PAYMENT', 'MCRP', date);
  }

  async nextLedgerEntryNumber(societyId: string, date: Date = new Date()): Promise<string> {
    return this.nextFixedPrefixNumber(societyId, 'LEDGER', 'MCRL', date);
  }

  async nextExpenseNumber(societyId: string, date: Date = new Date()): Promise<string> {
    return this.nextFixedPrefixNumber(societyId, 'EXPENSE', 'MCRE', date);
  }

  private async getPrefix(societyId: string, kind: 'demand' | 'receipt'): Promise<string> {
    const defaults = buildDefaultMcrSettingsInput();
    const settings = await McrSettings.findOne({ societyId }).lean();
    return kind === 'demand'
      ? settings?.demandNumberPrefix || defaults.demandNumberPrefix
      : settings?.receiptPrefix || defaults.receiptPrefix;
  }

  private async nextFixedPrefixNumber(
    societyId: string,
    sequenceType: 'PAYMENT' | 'LEDGER' | 'EXPENSE',
    prefix: string,
    date: Date
  ): Promise<string> {
    const periodKey = String(date.getUTCFullYear());
    const value = await sequenceCounterService.nextValue(societyId, sequenceType, periodKey);
    return `${prefix}/${periodKey}/${String(value).padStart(6, '0')}`;
  }
}

export const mcrNumberingService = new McrNumberingService();
