import { SequenceCounter } from './sequenceCounter.model';
import { ValidationError } from '../../common/errors/AppError';
import { McrSequenceType } from './mcrDomain.types';

export class SequenceCounterService {
  async nextValue(
    societyId: string,
    sequenceType: McrSequenceType,
    periodKey: string
  ): Promise<number> {
    if (!periodKey.trim()) {
      throw new ValidationError('periodKey is required');
    }

    const counter = await SequenceCounter.findOneAndUpdate(
      { societyId, sequenceType, periodKey },
      { $inc: { value: 1 } },
      { upsert: true, new: true }
    ).orFail();

    return counter.value;
  }
}

export const sequenceCounterService = new SequenceCounterService();
