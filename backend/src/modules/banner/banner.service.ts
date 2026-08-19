import { NotFoundError } from '../../common/errors/AppError';
import { Banner, IBannerDocument, BannerType } from './banner.model';

export interface BannerDto {
  title?: string;
  message: string;
  imageUrl?: string;
  linkUrl?: string;
  linkLabel?: string;
  bannerType?: BannerType;
  isActive?: boolean;
}

export class BannerService {
  async create(dto: BannerDto, createdBy: string): Promise<IBannerDocument> {
    return Banner.create({ ...dto, createdBy });
  }

  async list(): Promise<IBannerDocument[]> {
    return Banner.find().sort({ createdAt: -1 });
  }

  async listActive(): Promise<IBannerDocument[]> {
    return Banner.find({ isActive: true }).sort({ createdAt: -1 });
  }

  async update(id: string, dto: Partial<BannerDto>): Promise<IBannerDocument> {
    const updated = await Banner.findByIdAndUpdate(id, dto, { new: true, runValidators: true });
    if (!updated) throw new NotFoundError('Banner');
    return updated;
  }

  async disable(id: string): Promise<void> {
    const updated = await Banner.findByIdAndUpdate(id, { isActive: false });
    if (!updated) throw new NotFoundError('Banner');
  }
}

export const bannerService = new BannerService();
