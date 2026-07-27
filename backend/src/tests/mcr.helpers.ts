import { SocietyModuleConfig } from '../modules/moduleRegistry/moduleRegistry.model';
import { Flat } from '../modules/flat/flat.model';
import { Floor } from '../modules/floor/floor.model';
import { Resident } from '../modules/resident/resident.model';
import { Society } from '../modules/society/society.model';
import { Tower } from '../modules/tower/tower.model';
import { createUserWithRole } from './helpers';

export async function createMcrFixture() {
  const { user: superAdmin } = await createUserWithRole({ roleCode: 'JENIX_SUPER_ADMIN' });
  const stamp = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  const society = await Society.create({
    name: 'MCR Foundation Society',
    code: `JSO-MCR-${stamp.slice(-6)}`,
    address: '123 Test Road',
    city: 'Mumbai',
    state: 'Maharashtra',
    pincode: '400001',
    contactPersonName: 'Fixture Owner',
    contactMobile: '9000000001',
    contactEmail: 'mcr-fixture@test.com',
    createdBy: superAdmin._id,
    enabledModules: ['CORE', 'MCR'],
    status: 'ACTIVE',
    billingStatus: 'ACTIVE',
  });

  const { user: admin, token: adminToken } = await createUserWithRole({
    roleCode: 'SOCIETY_ADMIN',
    societyId: society._id.toString(),
  });

  await SocietyModuleConfig.create({
    societyId: society._id,
    moduleCode: 'MCR',
    isEnabled: true,
    enabledBy: admin._id,
  });

  return { society, admin, adminToken };
}

export async function createMcrFlat(fixture: { society: any; admin: any }, flatNo: string) {
  const tower = await Tower.create({
    societyId: fixture.society._id,
    name: `Tower ${flatNo}`,
    code: `T${flatNo.replace(/\W/g, '').slice(-3)}`,
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
  const flat = await Flat.create({
    societyId: fixture.society._id,
    towerId: tower._id,
    floorId: floor._id,
    flatNo,
    createdBy: fixture.admin._id,
  });
  await Resident.create({
    societyId: fixture.society._id,
    flatId: flat._id,
    name: `Resident ${flatNo}`,
    mobile: `9${Math.floor(Math.random() * 1_000_000_000).toString().padStart(9, '0')}`,
    email: `${flatNo.replace(/\W/g, '').toLowerCase()}@test.com`,
    memberType: 'OWNER',
    loginAllowed: true,
    primaryContact: true,
    createdBy: fixture.admin._id,
  });
  return flat;
}
