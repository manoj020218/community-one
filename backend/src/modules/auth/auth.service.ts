import { userService } from '../user/user.service';
import { comparePassword, hashPassword } from '../../common/utils/password';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../../common/utils/jwt';
import { AuthenticationError, ValidationError } from '../../common/errors/AppError';
import { LoginDto, LoginResponse, ChangePasswordDto } from './auth.types';
import { User } from '../user/user.model';

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
