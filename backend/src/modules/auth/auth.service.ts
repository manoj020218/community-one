import { OAuth2Client } from 'google-auth-library';
import { userService } from '../user/user.service';
import { comparePassword, hashPassword } from '../../common/utils/password';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../../common/utils/jwt';
import { AppError, AuthenticationError, ValidationError, ConflictError, NotFoundError } from '../../common/errors/AppError';
import {
  LoginDto, LoginResponse, ChangePasswordDto, OnboardSocietyDto, OnboardSocietyResult, GoogleLoginDto,
} from './auth.types';
import { User, IUserDocument } from '../user/user.model';
import { Society } from '../society/society.model';
import { env } from '../../config/env';

const googleClient = env.GOOGLE_CLIENT_ID ? new OAuth2Client(env.GOOGLE_CLIENT_ID) : null;

// ─── Service ──────────────────────────────────────────────────────────────────

function buildTokenPayload(user: IUserDocument) {
  return {
    userId: user._id!.toString(),
    email: user.email,
    mobile: user.mobile,
    roleCode: user.roleCode,
    permissions: user.permissions,
    societyId: user.societyId?.toString(),
    flatId: user.flatId?.toString(),
  };
}

async function buildLoginResponse(user: IUserDocument): Promise<LoginResponse> {
  const payload = buildTokenPayload(user);
  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken({ userId: user._id!.toString() });

  await userService.updateLastLogin(user._id!.toString());
  await userService.updateRefreshToken(user._id!.toString(), refreshToken);

  const society = user.societyId ? await Society.findById(user.societyId).select('name') : null;

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
      societyName: society?.name,
      flatId: user.flatId?.toString(),
      photoUrl: user.photoUrl,
    },
  };
}

export class AuthService {
  async login(dto: LoginDto): Promise<LoginResponse> {
    const user = await userService.findByMobileOrEmail(dto.identifier);
    if (!user) throw new AuthenticationError('Invalid credentials');

    const valid = await comparePassword(dto.password, user.passwordHash);
    if (!valid) throw new AuthenticationError('Invalid credentials');

    return buildLoginResponse(user);
  }

  // Sign in with a Google ID token. Accounts are never created here — the user
  // must already have been provisioned (via the billing bridge or an admin).
  // We only match by verified email, same restriction FireGuard enforces.
  async googleLogin(dto: GoogleLoginDto): Promise<LoginResponse> {
    if (!googleClient) {
      throw new AppError('Google sign-in is not configured', 503, 'GOOGLE_LOGIN_UNAVAILABLE');
    }

    let email: string | undefined;
    let emailVerified: boolean | undefined;
    try {
      const ticket = await googleClient.verifyIdToken({
        idToken: dto.idToken,
        audience: env.GOOGLE_CLIENT_ID,
      });
      const payload = ticket.getPayload();
      email = payload?.email;
      emailVerified = payload?.email_verified;
    } catch {
      throw new AuthenticationError('Invalid Google sign-in token');
    }

    if (!email || emailVerified === false) {
      throw new AuthenticationError('Google account email could not be verified');
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user || !user.isActive) {
      throw new NotFoundError('No account for this Google email. Please contact your society admin.');
    }

    return buildLoginResponse(user);
  }

  // Thin proxy: the billing platform owns signup dedup + Client tracking and
  // provisions the Society + admin user via this backend's /api/bridge/provision — but
  // that provisioning call can happen asynchronously after the billing platform already
  // told the browser "queued", so a duplicate-email rejection there can be invisible to
  // the user. Check our own User collection synchronously first so the common case
  // (re-registering with an email already used on this platform) always surfaces
  // immediately, regardless of the billing platform's own timing.
  async onboardSociety(dto: OnboardSocietyDto): Promise<OnboardSocietyResult> {
    if (!env.BILLING_API_BASE) {
      throw new AppError('Society registration is not configured', 503, 'BILLING_UNAVAILABLE');
    }

    const normalizedEmail = dto.email.toLowerCase().trim();
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      throw new ConflictError(`An account with email ${normalizedEmail} already exists. Please login instead, or use a different email.`);
    }

    let resp: globalThis.Response;
    try {
      resp = await fetch(`${env.BILLING_API_BASE}/api/community/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dto),
      });
    } catch {
      throw new AppError('Could not reach the billing platform. Please try again later.', 502, 'BILLING_UNREACHABLE');
    }

    const body = await resp.json().catch(() => ({}) as Record<string, unknown>);

    if (!resp.ok) {
      const message = (body as any)?.error || 'Society registration failed';
      if (resp.status === 409) throw new ConflictError(message);
      throw new AppError(message, 502, 'BILLING_ERROR');
    }

    return {
      societyName: dto.societyName.trim(),
      societyCode: (body as any).societyCode,
      email: (body as any).email,
      password: (body as any).tempPassword,
      trialEndsAt: new Date((body as any).trialEndsAt),
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
