import { ValidationError } from '../../common/errors/AppError';
import { FileAsset } from '../fileAsset/fileAsset.model';

export class SamaFileValidationService {
  async assertSocietyFiles(societyId: string, fileIds: string[] = []): Promise<void> {
    if (!fileIds.length) return;
    const files = await FileAsset.find({ _id: { $in: fileIds }, isActive: true });
    if (files.length !== fileIds.length) throw new ValidationError('One or more referenced files are invalid');
    const invalidFile = files.find((item) => item.societyId?.toString() !== societyId);
    if (invalidFile) throw new ValidationError('Referenced files must belong to the same society');
  }
}

export const samaFileValidationService = new SamaFileValidationService();
