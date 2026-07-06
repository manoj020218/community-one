import { User, IUserDocument } from './user.model';
import { CreateUserDto, UpdateUserDto } from './user.types';
import { hashPassword } from '../../common/utils/password';
import { roleService } from '../role/role.service';
import { NotFoundError, ConflictError } from '../../common/errors/AppError';

export class UserService {
  async create(dto: CreateUserDto): Promise<IUserDocument> {
    const existing = await User.findOne({ email: dto.email.toLowerCase() });
    if (existing) throw new ConflictError('Email already registered');

    const permissions = await roleService.getPermissionsForRole(dto.roleCode);
    const passwordHash = await hashPassword(dto.password);

    return User.create({
      ...dto,
      email: dto.email.toLowerCase(),
      passwordHash,
      permissions,
    });
  }

  async findById(id: string): Promise<IUserDocument> {
    const user = await User.findById(id).select('-passwordHash -refreshToken');
    if (!user) throw new NotFoundError('User');
    return user;
  }

  async findByEmail(email: string): Promise<IUserDocument | null> {
    return User.findOne({ email: email.toLowerCase() });
  }

  async findByMobileOrEmail(identifier: string): Promise<IUserDocument | null> {
    return User.findOne({
      $or: [{ email: identifier.toLowerCase() }, { mobile: identifier }],
      isActive: true,
    });
  }

  async findBySociety(societyId: string): Promise<IUserDocument[]> {
    return User.find({ societyId, isActive: true }).select('-passwordHash -refreshToken');
  }

  async update(id: string, dto: UpdateUserDto): Promise<IUserDocument> {
    const user = await User.findByIdAndUpdate(id, dto, { new: true, runValidators: true })
      .select('-passwordHash -refreshToken');
    if (!user) throw new NotFoundError('User');
    return user;
  }

  async updateRefreshToken(id: string, token: string | null): Promise<void> {
    await User.findByIdAndUpdate(id, { refreshToken: token });
  }

  async updateLastLogin(id: string): Promise<void> {
    await User.findByIdAndUpdate(id, { lastLoginAt: new Date() });
  }

  async disable(id: string): Promise<void> {
    await User.findByIdAndUpdate(id, { isActive: false });
  }
}

export const userService = new UserService();
