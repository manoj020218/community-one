import { FirmwareRelease, IFirmwareReleaseDocument } from './firmwareRelease.model';
import { NotFoundError } from '../../common/errors/AppError';

export interface CreateFirmwareReleaseDto {
  deviceModel: string;
  version: string;
  url: string;
  sha256: string;
  releaseNotes?: string;
}

export class FirmwareReleaseService {
  async register(dto: CreateFirmwareReleaseDto, createdBy: string): Promise<IFirmwareReleaseDocument> {
    return FirmwareRelease.create({ ...dto, deviceModel: dto.deviceModel.toLowerCase(), createdBy });
  }

  /** Public, unauthenticated — a field gateway checks this with nothing but its own compiled-in model name. */
  async getLatest(deviceModel: string): Promise<IFirmwareReleaseDocument> {
    const release = await FirmwareRelease.findOne({ deviceModel: deviceModel.toLowerCase() }).sort({ createdAt: -1 });
    if (!release) throw new NotFoundError('Firmware release');
    return release;
  }
}

export const firmwareReleaseService = new FirmwareReleaseService();
