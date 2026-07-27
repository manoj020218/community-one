import { ValidationError } from '../../common/errors/AppError';
import { SamaSequence } from './samaSequence.model';

export class SamaNumberingService {
  async nextStaffCode(societyId: string, date: Date = new Date()): Promise<string> {
    return this.nextCode(societyId, 'STAFF', 'SAMA-STF', date);
  }

  async nextServiceProviderCode(societyId: string, date: Date = new Date()): Promise<string> {
    return this.nextCode(societyId, 'SERVICE_PROVIDER', 'SAMA-SP', date);
  }

  async nextWorkOrderCode(societyId: string, date: Date = new Date()): Promise<string> {
    return this.nextCode(societyId, 'WORK_ORDER', 'SAMA-WO', date);
  }

  private async nextCode(
    societyId: string,
    sequenceType: 'STAFF' | 'SERVICE_PROVIDER' | 'WORK_ORDER',
    prefix: string,
    date: Date
  ): Promise<string> {
    const periodKey = String(date.getUTCFullYear());
    if (!periodKey.trim()) throw new ValidationError('periodKey is required');
    const counter = await SamaSequence.findOneAndUpdate(
      { societyId, sequenceType, periodKey },
      { $inc: { value: 1 } },
      { upsert: true, new: true }
    ).orFail();
    return `${prefix}/${periodKey}/${String(counter.value).padStart(6, '0')}`;
  }
}

export const samaNumberingService = new SamaNumberingService();
