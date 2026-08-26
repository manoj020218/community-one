import { Society, ISocietyDocument } from './society.model';
import { CreateSocietyDto, UpdateSocietyDto } from './society.types';
import { NotFoundError, ConflictError } from '../../common/errors/AppError';
import { SOCIETY_CODE_PREFIX, MODULE_CODES } from '../../config/constants';
import { buildPaginatedResult } from '../../common/utils/response';
import { PaginatedResult } from '../../common/types';

function generateCode(name: string): string {
  const clean = name.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 13);
  return `${SOCIETY_CODE_PREFIX}-${clean}`;
}

// Excludes visually-ambiguous characters (0/O, 1/I/L) since this is meant to be read off a
// screen and typed/said aloud, unlike `code` above which is a full onboarding slug.
const SHORT_ID_CHARS = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';

function randomShortId(): string {
  let id = '';
  for (let i = 0; i < 4; i++) id += SHORT_ID_CHARS[Math.floor(Math.random() * SHORT_ID_CHARS.length)];
  return id;
}

export async function generateUniqueShortId(): Promise<string> {
  for (let attempt = 0; attempt < 10; attempt++) {
    const candidate = randomShortId();
    if (!(await Society.findOne({ shortId: candidate }))) return candidate;
  }
  throw new Error('Could not generate a unique society short ID after 10 attempts');
}

export class SocietyService {
  async create(dto: CreateSocietyDto, createdBy: string): Promise<ISocietyDocument> {
    const code = generateCode(dto.name);
    const existing = await Society.findOne({ code });
    if (existing) throw new ConflictError(`Society code ${code} already exists`);
    const shortId = await generateUniqueShortId();

    return Society.create({
      ...dto,
      code,
      shortId,
      createdBy,
      enabledModules: [MODULE_CODES.CORE],
      country: dto.country || 'India',
    });
  }

  // One-time backfill for societies created before `shortId` existed — safe to re-run,
  // only touches documents that don't have one yet.
  async backfillShortIds(): Promise<number> {
    const missing = await Society.find({ shortId: { $exists: false } });
    let updated = 0;
    for (const society of missing) {
      society.shortId = await generateUniqueShortId();
      await society.save();
      updated += 1;
    }
    return updated;
  }

  async findAll(page: number, limit: number, search?: string, scopedSocietyId?: string): Promise<PaginatedResult<ISocietyDocument>> {
    const query: any = { isActive: true };
    if (scopedSocietyId) query._id = scopedSocietyId;
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

  async getStats(scopedSocietyId?: string): Promise<{ total: number; active: number; onboarding: number }> {
    const base: any = { isActive: true };
    if (scopedSocietyId) base._id = scopedSocietyId;
    const [total, active, onboarding] = await Promise.all([
      Society.countDocuments(base),
      Society.countDocuments({ ...base, status: 'ACTIVE' }),
      Society.countDocuments({ ...base, status: 'ONBOARDING' }),
    ]);
    return { total, active, onboarding };
  }
}

export const societyService = new SocietyService();
