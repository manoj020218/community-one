import { Flat } from '../modules/flat/flat.model';
import { Floor } from '../modules/floor/floor.model';
import { Resident } from '../modules/resident/resident.model';
import { Society } from '../modules/society/society.model';
import { SocietyModuleConfig } from '../modules/moduleRegistry/moduleRegistry.model';
import { Tower } from '../modules/tower/tower.model';
import { createUserWithRole } from './helpers';
import { createSuperAdmin } from './helpers';

export async function createSamaSociety() {
  const { user } = await createSuperAdmin();
  return Society.create({
    name: 'SAMA Society',
    code: `JSO-SAMA-${Date.now().toString().slice(-4)}`,
    address: '123 Test Road',
    city: 'Mumbai',
    state: 'Maharashtra',
    pincode: '400001',
    contactPersonName: 'SAMA Owner',
    contactMobile: '9000000001',
    contactEmail: 'sama@test.com',
    createdBy: user._id,
    enabledModules: ['CORE', 'SAMA'],
    status: 'ACTIVE',
    billingStatus: 'ACTIVE',
  });
}

export async function enableSamaModule(societyId: string, userId: string): Promise<void> {
  await SocietyModuleConfig.create({
    societyId,
    moduleCode: 'SAMA',
    isEnabled: true,
    enabledBy: userId,
  });
}

export async function createSamaFixture() {
  const society = await createSamaSociety();
  const { user: admin, token: adminToken } = await createUserWithRole({
    roleCode: 'SOCIETY_ADMIN',
    societyId: society._id.toString(),
  });
  await enableSamaModule(society._id.toString(), admin._id.toString());
  return { society, admin, adminToken };
}

export async function createSamaFlat(fixture: { society: any; admin: any }, flatNo: string) {
  const tower = await Tower.create({
    societyId: fixture.society._id,
    name: `Tower ${flatNo}`,
    code: `TS${flatNo.replace(/\W/g, '').slice(-4)}`,
    numberOfFloors: 1,
    createdBy: fixture.admin._id,
  });
  const floor = await Floor.create({
    societyId: fixture.society._id,
    towerId: tower._id,
    floorNumber: 1,
    floorName: 'Floor 1',
    createdBy: fixture.admin._id,
  });
  return Flat.create({
    societyId: fixture.society._id,
    towerId: tower._id,
    floorId: floor._id,
    flatNo,
    createdBy: fixture.admin._id,
  });
}

export async function createResidentUserForFlat(
  fixture: { society: any; admin?: any },
  flat: any,
  roleCode: 'OWNER' | 'TENANT' = 'OWNER'
) {
  const resident = await Resident.create({
    societyId: fixture.society._id,
    flatId: flat._id,
    name: `${roleCode} ${flat.flatNo}`,
    mobile: `9${Math.floor(Math.random() * 1_000_000_000).toString().padStart(9, '0')}`,
    email: `${roleCode.toLowerCase()}-${flat.flatNo.replace(/\W/g, '').toLowerCase()}@test.com`,
    memberType: roleCode,
    loginAllowed: true,
    primaryContact: true,
    createdBy: fixture.admin?._id || flat.createdBy,
  });
  const { user, token } = await createUserWithRole({
    roleCode,
    societyId: fixture.society._id.toString(),
    flatId: flat._id.toString(),
    email: resident.email,
  });
  resident.userId = user._id.toString();
  await resident.save();
  return { resident, user, token };
}
