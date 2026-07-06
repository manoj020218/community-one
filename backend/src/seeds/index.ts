import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import { connectDatabase } from '../config/database';
import { Role } from '../modules/role/role.model';
import { User } from '../modules/user/user.model';
import { ModuleRegistry } from '../modules/moduleRegistry/moduleRegistry.model';
import { ReportDefinition } from '../modules/report/report.model';
import { hashPassword } from '../common/utils/password';
import { ROLE_PERMISSIONS } from './permissions.seed';
import { MODULES_SEED } from './modules.seed';
import { REPORTS_SEED } from './reports.seed';
import { env } from '../config/env';

async function seed(): Promise<void> {
  await connectDatabase();
  console.log('Connected to MongoDB. Starting seed...');

  // Seed Roles
  for (const [code, permissions] of Object.entries(ROLE_PERMISSIONS)) {
    await Role.findOneAndUpdate(
      { code },
      { code, name: code.replace(/_/g, ' '), permissions, isSystemRole: true },
      { upsert: true, new: true }
    );
  }
  console.log('Roles seeded');

  // Seed Modules
  for (const module of MODULES_SEED) {
    await ModuleRegistry.findOneAndUpdate({ code: module.code }, module, { upsert: true, new: true });
  }
  console.log('Modules seeded');

  // Seed Report Definitions
  for (const report of REPORTS_SEED) {
    await ReportDefinition.findOneAndUpdate({ code: report.code }, report, { upsert: true, new: true });
  }
  console.log('Reports seeded');

  // Seed Super Admin
  const existing = await User.findOne({ email: env.SUPER_ADMIN_EMAIL });
  if (!existing) {
    const passwordHash = await hashPassword(env.SUPER_ADMIN_PASSWORD);
    const superAdminPerms = ROLE_PERMISSIONS['JENIX_SUPER_ADMIN'];
    await User.create({
      name: 'Jenix Super Admin',
      email: env.SUPER_ADMIN_EMAIL,
      mobile: env.SUPER_ADMIN_MOBILE,
      passwordHash,
      roleCode: 'JENIX_SUPER_ADMIN',
      permissions: superAdminPerms,
      isActive: true,
      isEmailVerified: true,
      isMobileVerified: true,
    });
    console.log(`Super admin created: ${env.SUPER_ADMIN_EMAIL}`);
  } else {
    console.log('Super admin already exists');
  }

  console.log('\nSeed completed successfully!');
  console.log(`Login: ${env.SUPER_ADMIN_EMAIL} / ${env.SUPER_ADMIN_PASSWORD}`);
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
