import mongoose from 'mongoose';
import { hashPassword } from '../common/utils/password';
import { User } from '../modules/user/user.model';
import { Role } from '../modules/role/role.model';
import { ROLE_PERMISSIONS } from '../seeds/permissions.seed';
import { signAccessToken } from '../common/utils/jwt';

export async function connectTestDb(): Promise<void> {
  const uri = (global as any).__MONGO_URI__;
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(uri);
  }
}

export async function clearDb(): Promise<void> {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
}

export async function seedRoles(): Promise<void> {
  for (const [code, permissions] of Object.entries(ROLE_PERMISSIONS)) {
    await Role.findOneAndUpdate({ code }, { code, name: code, permissions, isSystemRole: true }, { upsert: true });
  }
}

export async function createTestUser(overrides: Partial<any> = {}): Promise<{ user: any; token: string }> {
  const passwordHash = await hashPassword('Test@1234');
  const permissions = ROLE_PERMISSIONS['SOCIETY_ADMIN'];
  const user = await User.create({
    name: 'Test Admin',
    email: `admin-${Date.now()}@test.com`,
    mobile: `9${Date.now().toString().slice(-9)}`,
    passwordHash,
    roleCode: 'SOCIETY_ADMIN',
    permissions,
    isActive: true,
    ...overrides,
  });

  const token = signAccessToken({
    userId: user._id.toString(),
    email: user.email,
    mobile: user.mobile,
    roleCode: user.roleCode,
    permissions: user.permissions,
  });

  return { user, token };
}

export async function createSuperAdmin(): Promise<{ user: any; token: string }> {
  const passwordHash = await hashPassword('Admin@123');
  const permissions = ROLE_PERMISSIONS['JENIX_SUPER_ADMIN'];
  const user = await User.create({
    name: 'Super Admin',
    email: 'superadmin@test.com',
    mobile: '9999999999',
    passwordHash,
    roleCode: 'JENIX_SUPER_ADMIN',
    permissions,
    isActive: true,
  });

  const token = signAccessToken({
    userId: user._id.toString(),
    email: user.email,
    mobile: user.mobile,
    roleCode: user.roleCode,
    permissions: user.permissions,
  });

  return { user, token };
}
