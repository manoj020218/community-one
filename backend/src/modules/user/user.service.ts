import { User, IUserDocument } from './user.model';
import { CreateUserDto, UpdateUserDto } from './user.types';
import { hashPassword, validateCredentialStrength } from '../../common/utils/password';
import { roleService } from '../role/role.service';
import { Flat } from '../flat/flat.model';
import { NotFoundError, ConflictError, ValidationError } from '../../common/errors/AppError';

export class UserService {
  async create(dto: CreateUserDto): Promise<IUserDocument> {
    const existing = await User.findOne({ email: dto.email.toLowerCase() });
    if (existing) throw new ConflictError('Email already registered');

    // Login is looked up by mobile OR email (findByMobileOrEmail) — a second active account
    // sharing the same mobile makes that lookup ambiguous (whichever Mongo happens to return
    // first), so a login can silently start failing for an existing account the moment a new
    // one is created with the same number. If this is the same person who already has a
    // staff/admin login, the right move is linking that existing account to a flat (Users →
    // Link Flat) instead of creating a second one.
    const existingMobile = await User.findOne({ mobile: dto.mobile, isActive: true });
    if (existingMobile) {
      throw new ConflictError(`This mobile number is already registered to ${existingMobile.name} (${existingMobile.roleCode}). If this is the same person, link their existing account to a flat instead of creating a new login.`);
    }

    validateCredentialStrength(dto.roleCode, dto.password);

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
    return User.find({ societyId, isActive: true })
      .select('-passwordHash -refreshToken')
      .populate({ path: 'flatId', select: 'flatNo towerId', populate: { path: 'towerId', select: 'name code' } });
  }

  // A staff/admin account (Society Admin, Committee Member, etc.) is very often also a
  // resident of the society they manage — this links their account to their own flat so
  // resident-facing self-service views (My Maintenance, own visitor requests) can find
  // "their" flat without needing a second login under a different role.
  async linkFlat(id: string, flatId: string | null): Promise<IUserDocument> {
    const user = await User.findById(id);
    if (!user) throw new NotFoundError('User');

    if (flatId) {
      const flat = await Flat.findOne({ _id: flatId, societyId: user.societyId, isActive: true });
      if (!flat) throw new ValidationError('Flat does not belong to this society');
    }

    const updated = await User.findByIdAndUpdate(
      id,
      flatId ? { flatId } : { $unset: { flatId: 1 } },
      { new: true }
    ).select('-passwordHash -refreshToken')
      .populate({ path: 'flatId', select: 'flatNo towerId', populate: { path: 'towerId', select: 'name code' } });
    return updated!;
  }

  async resetPassword(id: string, newPassword: string): Promise<IUserDocument> {
    const user = await User.findById(id);
    if (!user) throw new NotFoundError('User');

    validateCredentialStrength(user.roleCode, newPassword);

    const passwordHash = await hashPassword(newPassword);
    await User.findByIdAndUpdate(id, { passwordHash, refreshToken: null });
    return this.findById(id);
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
