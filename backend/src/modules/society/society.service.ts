import { Society, ISocietyDocument } from './society.model';
import { CreateSocietyDto, UpdateSocietyDto } from './society.types';
import { NotFoundError, ConflictError } from '../../common/errors/AppError';
import { SOCIETY_CODE_PREFIX, MODULE_CODES } from '../../config/constants';
import { buildPaginatedResult } from '../../common/utils/response';
import { PaginatedResult } from '../../common/types';

function generateCode(name: string): string {
  const clean = name.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12);
  return `${SOCIETY_CODE_PREFIX}-${clean}`;
}

export class SocietyService {
  async create(dto: CreateSocietyDto, createdBy: string): Promise<ISocietyDocument> {
    const code = generateCode(dto.name);
    const existing = await Society.findOne({ code });
    if (existing) throw new ConflictError(`Society code ${code} already exists`);

    return Society.create({
      ...dto,
      code,
      createdBy,
      enabledModules: [MODULE_CODES.CORE],
      country: dto.country || 'India',
    });
  }

  async findAll(page: number, limit: number, search?: string): Promise<PaginatedResult<ISocietyDocument>> {
    const query: any = { isActive: true };
    if (search) query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { code: { $regex: search, $options: 'i' } },
      { city: { $regex: search, $options: 'i' } },
    ];

    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      Society.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Society.countDocuments(query),
    ]);
    return buildPaginatedResult(items, total, page, limit);
  }

  async findById(id: string): Promise<ISocietyDocument> {
    const society = await Society.findById(id);
    if (!society || !society.isActive) throw new NotFoundError('Society');
    return society;
  }

  async update(id: string, dto: UpdateSocietyDto): Promise<ISocietyDocument> {
    const society = await Society.findByIdAndUpdate(id, dto, { new: true, runValidators: true });
    if (!society) throw new NotFoundError('Society');
    return society;
  }

  async completeOnboarding(id: string): Promise<ISocietyDocument> {
    const society = await Society.findByIdAndUpdate(
      id,
      { onboardingComplete: true, status: 'ACTIVE' },
      { new: true }
    );
    if (!society) throw new NotFoundError('Society');
    return society;
  }

  async disable(id: string): Promise<void> {
    await Society.findByIdAndUpdate(id, { isActive: false, status: 'INACTIVE' });
  }

  async getStats(): Promise<{ total: number; active: number; onboarding: number }> {
    const [total, active, onboarding] = await Promise.all([
      Society.countDocuments({ isActive: true }),
      Society.countDocuments({ status: 'ACTIVE' }),
      Society.countDocuments({ status: 'ONBOARDING' }),
    ]);
    return { total, active, onboarding };
  }
}

export const societyService = new SocietyService();
