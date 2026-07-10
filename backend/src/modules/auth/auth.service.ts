import { userService } from '../user/user.service';
import { comparePassword, hashPassword } from '../../common/utils/password';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../../common/utils/jwt';
import { AuthenticationError, ValidationError, ConflictError } from '../../common/errors/AppError';
import { LoginDto, LoginResponse, ChangePasswordDto, OnboardSocietyDto, OnboardSocietyResult } from './auth.types';
import { User } from '../user/user.model';
import { Society } from '../society/society.model';
import { roleService } from '../role/role.service';
import { MODULE_CODES, SOCIETY_CODE_PREFIX } from '../../config/constants';

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

async function notifyBillingServer(data: Record<string, unknown>): Promise<void> {
  const billingUrl = process.env.BILLING_SERVER_URL;
  if (!billingUrl) return;
  try {
    await fetch(`${billingUrl}/webhooks/community-onboard`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-webhook-secret': process.env.BILLING_WEBHOOK_SECRET || '',
      },
      body: JSON.stringify(data),
    });
  } catch (err) {
    console.error('[Billing webhook] Failed to notify billing server:', err);
  }
}

// ─── Service ──────────────────────────────────────────────────────────────────

export class AuthService {
  async login(dto: LoginDto): Promise<LoginResponse> {
    const user = await userService.findByMobileOrEmail(dto.identifier);
    if (!user) throw new AuthenticationError('Invalid credentials');

    const valid = await comparePassword(dto.password, user.passwordHash);
    if (!valid) throw new AuthenticationError('Invalid credentials');

    await userService.updateLastLogin(user._id!.toString());

    const payload = {
      userId: user._id!.toString(),
      email: user.email,
      mobile: user.mobile,
      roleCode: user.roleCode,
      permissions: user.permissions,
      societyId: user.societyId?.toString(),
      flatId: user.flatId?.toString(),
    };

    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken({ userId: user._id!.toString() });
    await userService.updateRefreshToken(user._id!.toString(), refreshToken);

    return {
      accessToken,
      refreshToken,
      user: {
        _id: user._id!.toString(),
        name: user.name,
        email: user.email,
        mobile: user.mobile,
        roleCode: user.roleCode,
        permissions: user.permissions,
        societyId: user.societyId?.toString(),
        flatId: user.flatId?.toString(),
        photoUrl: user.photoUrl,
      },
    };
  }

  async onboardSociety(dto: OnboardSocietyDto): Promise<OnboardSocietyResult> {
    const nameTrimmed = dto.societyName.trim();
    const cityTrimmed = dto.city.trim();

    // Duplicate check 1: same mobile + same society name + city + pincode
    const dupByMobile = await Society.findOne({
      contactMobile: dto.mobile.trim(),
      name: { $regex: `^${escapeRegex(nameTrimmed)}$`, $options: 'i' },
      city: { $regex: `^${escapeRegex(cityTrimmed)}$`, $options: 'i' },
      pincode: dto.pincode.trim(),
      isActive: true,
    });
    if (dupByMobile) {
      throw new ConflictError(
        `Mobile ${dto.mobile} has already registered society "${dupByMobile.name}". Contact support@iotsoft.in for your login credentials.`
      );
    }

    // Duplicate check 2: same society name + city + pincode (different person)
    const dupBySociety = await Society.findOne({
      name: { $regex: `^${escapeRegex(nameTrimmed)}$`, $options: 'i' },
      city: { $regex: `^${escapeRegex(cityTrimmed)}$`, $options: 'i' },
      pincode: dto.pincode.trim(),
      isActive: true,
    });
    if (dupBySociety) {
      throw new ConflictError(
        `Society "${dupBySociety.name}" in ${dto.city} is already registered. Contact support@iotsoft.in to get access.`
      );
    }

    // Check email not already taken
    const existingUser = await User.findOne({ email: dto.email.toLowerCase().trim() });
    if (existingUser) {
      throw new ConflictError(`Email ${dto.email} is already registered. Please use a different email or contact support@iotsoft.in.`);
    }

    // Generate unique society code and password
    const code = await generateUniqueSocietyCode(nameTrimmed);
    const password = generatePassword();
    const passwordHash = await hashPassword(password);
    const permissions = await roleService.getPermissionsForRole('SOCIETY_ADMIN');

    // Create admin user first (societyId linked after society creation)
    const adminUser = await User.create({
      name: dto.contactPersonName.trim(),
      email: dto.email.toLowerCase().trim(),
      mobile: dto.mobile.trim(),
      passwordHash,
      roleCode: 'SOCIETY_ADMIN',
      permissions,
      isActive: true,
      isEmailVerified: false,
      isMobileVerified: false,
    });

    // Trial: 6 months from today
    const trialEndsAt = new Date();
    trialEndsAt.setMonth(trialEndsAt.getMonth() + 6);

    // Create society (admin user is the creator)
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
      contactEmail: dto.email.toLowerCase().trim(),
      createdBy: adminUser._id,
      enabledModules: [MODULE_CODES.CORE],
      agentCode: dto.agentCode?.trim() || undefined,
      trialEndsAt,
      selfOnboarded: true,
      status: 'ONBOARDING',
      billingStatus: 'TRIAL',
    });

    // Link admin user to their new society
    await User.findByIdAndUpdate(adminUser._id, { societyId: society._id });

    // Notify billing server (non-blocking — failure does not affect registration)
    notifyBillingServer({
      societyId: society._id!.toString(),
      societyName: society.name,
      societyCode: society.code,
      city: society.city,
      state: society.state,
      pincode: society.pincode,
      address: society.address,
      contactPersonName: society.contactPersonName,
      contactEmail: society.contactEmail,
      contactMobile: society.contactMobile,
      agentCode: dto.agentCode || null,
      credentials: { email: dto.email.toLowerCase().trim(), password },
      trialEndsAt: trialEndsAt.toISOString(),
      onboardedAt: new Date().toISOString(),
    });

    return {
      societyName: society.name,
      societyCode: society.code,
      email: dto.email.toLowerCase().trim(),
      password,
      trialEndsAt,
    };
  }

  async refreshToken(token: string): Promise<{ accessToken: string }> {
    let payload: { userId: string };
    try {
      payload = verifyRefreshToken(token);
    } catch {
      throw new AuthenticationError('Invalid refresh token');
    }

    const user = await User.findById(payload.userId);
    if (!user || user.refreshToken !== token) {
      throw new AuthenticationError('Refresh token revoked');
    }

    const accessToken = signAccessToken({
      userId: user._id!.toString(),
      email: user.email,
      mobile: user.mobile,
      roleCode: user.roleCode,
      permissions: user.permissions,
      societyId: user.societyId?.toString(),
      flatId: user.flatId?.toString(),
    });

    return { accessToken };
  }

  async logout(userId: string): Promise<void> {
    await userService.updateRefreshToken(userId, null);
  }

  async changePassword(userId: string, dto: ChangePasswordDto): Promise<void> {
    const user = await User.findById(userId);
    if (!user) throw new AuthenticationError('User not found');

    const valid = await comparePassword(dto.currentPassword, user.passwordHash);
    if (!valid) throw new ValidationError('Current password is incorrect');

    const newHash = await hashPassword(dto.newPassword);
    await User.findByIdAndUpdate(userId, { passwordHash: newHash });
  }
}

export const authService = new AuthService();
