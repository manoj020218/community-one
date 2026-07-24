import { User } from '../user/user.model';
import { Society } from '../society/society.model';
import { roleService } from '../role/role.service';
import { hashPassword } from '../../common/utils/password';
import { ConflictError } from '../../common/errors/AppError';
import { MODULE_CODES, SOCIETY_CODE_PREFIX } from '../../config/constants';
import { env } from '../../config/env';
import { ProvisionSocietyDto, ProvisionSocietyResult } from './bridge.types';

const ADJECTIVES = ['Blue', 'Green', 'Royal', 'Silver', 'Golden', 'Smart', 'Grand', 'Swift', 'Bright', 'Clear'];
const NOUNS = ['Tiger', 'Diamond', 'Eagle', 'Crown', 'Ridge', 'Peak', 'Grove', 'Valley', 'River', 'Stone'];

function generatePassword(): string {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  const num = Math.floor(1000 + Math.random() * 9000);
  return `${adj}${noun}@${num}`;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function generateUniqueSocietyCode(name: string): Promise<string> {
  const clean = name.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
  const base = `${SOCIETY_CODE_PREFIX}-${clean}`;
  const count = await Society.countDocuments({ code: { $regex: `^${escapeRegex(base)}` } });
  return count === 0 ? base : `${base}${count + 1}`;
}

export class BridgeService {
  /**
   * Called by the billing platform (X-Bridge-Secret) to provision a Society +
   * SOCIETY_ADMIN user for a customer who signed up on the billing/marketing site.
   */
  async provisionSociety(dto: ProvisionSocietyDto): Promise<ProvisionSocietyResult> {
    const nameTrimmed = dto.societyName.trim();
    const cityTrimmed = dto.city.trim();
    const normalizedEmail = dto.email.toLowerCase().trim();

    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      throw new ConflictError(`A user with email ${normalizedEmail} already exists`);
    }

    const dupBySociety = await Society.findOne({
      name: { $regex: `^${escapeRegex(nameTrimmed)}$`, $options: 'i' },
      city: { $regex: `^${escapeRegex(cityTrimmed)}$`, $options: 'i' },
      pincode: dto.pincode.trim(),
      isActive: true,
    });
    if (dupBySociety) {
      throw new ConflictError(`Society "${dupBySociety.name}" in ${dto.city} is already registered`);
    }

    const code = await generateUniqueSocietyCode(nameTrimmed);
    const password = generatePassword();
    const passwordHash = await hashPassword(password);
    const permissions = await roleService.getPermissionsForRole('SOCIETY_ADMIN');

    const adminUser = await User.create({
      name: dto.contactPersonName.trim(),
      email: normalizedEmail,
      mobile: dto.mobile.trim(),
      passwordHash,
      roleCode: 'SOCIETY_ADMIN',
      permissions,
      isActive: true,
      isEmailVerified: false,
      isMobileVerified: false,
    });

    const trialEndsAt = dto.trialEndsAt ? new Date(dto.trialEndsAt) : defaultTrialEnd();

    const society = await Society.create({
      name: nameTrimmed,
      code,
      address: dto.address.trim(),
      city: cityTrimmed,
      state: dto.state.trim(),
      pincode: dto.pincode.trim(),
      country: 'India',
      contactPersonName: dto.contactPersonName.trim(),
      contactMobile: dto.mobile.trim(),
      contactEmail: normalizedEmail,
      createdBy: adminUser._id,
      enabledModules: [MODULE_CODES.CORE],
      agentCode: dto.agentCode?.trim() || undefined,
      trialEndsAt,
      selfOnboarded: false,
      status: 'ONBOARDING',
      billingStatus: 'TRIAL',
    });

    await User.findByIdAndUpdate(adminUser._id, { societyId: society._id });

    return {
      ok: true,
      societyId: String(society._id),
      adminUserId: String(adminUser._id),
      societyCode: society.code,
      adminEmail: normalizedEmail,
      tempPassword: password,
      loginUrl: env.APP_LOGIN_URL || `${env.FRONTEND_URL}/login`,
      trialEndsAt: trialEndsAt.toISOString(),
    };
  }
}

function defaultTrialEnd(): Date {
  const d = new Date();
  d.setMonth(d.getMonth() + 6);
  return d;
}

export const bridgeService = new BridgeService();
