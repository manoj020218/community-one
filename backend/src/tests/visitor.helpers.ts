import { SocietyModuleConfig } from '../modules/moduleRegistry/moduleRegistry.model';
import { FileAsset } from '../modules/fileAsset/fileAsset.model';
import { Flat } from '../modules/flat/flat.model';
import { Floor } from '../modules/floor/floor.model';
import { Gate } from '../modules/gate/gate.model';
import { GuardAssignment } from '../modules/guardAssignment/guardAssignment.model';
import { Resident } from '../modules/resident/resident.model';
import { Society } from '../modules/society/society.model';
import { Tower } from '../modules/tower/tower.model';
import { createSuperAdmin, createUserWithRole } from './helpers';

export async function createVisitorFixture() {
  const { user: superAdmin } = await createSuperAdmin();
  const society = await Society.create({
    name: 'Visitor Society',
    code: `JSO-VIS-${Date.now().toString().slice(-4)}`,
    address: '123 Test Road',
    city: 'Mumbai',
    state: 'Maharashtra',
    pincode: '400001',
    contactPersonName: 'Fixture Owner',
    contactMobile: '9000000001',
    contactEmail: 'fixture@test.com',
    createdBy: superAdmin._id,
    enabledModules: ['CORE', 'VISITOR'],
    status: 'ACTIVE',
    billingStatus: 'ACTIVE',
  });

  const { user: admin, token: adminToken } = await createUserWithRole({ roleCode: 'SOCIETY_ADMIN', societyId: society._id.toString() });
  const tower = await Tower.create({ societyId: society._id, name: 'Tower A', code: 'TA', numberOfFloors: 2, createdBy: admin._id });
  const floor = await Floor.create({ societyId: society._id, towerId: tower._id, floorNumber: 1, floorName: 'Floor 1', createdBy: admin._id });
  const flat = await Flat.create({ societyId: society._id, towerId: tower._id, floorId: floor._id, flatNo: 'A-101', createdBy: admin._id });
  const { user: guard, token: guardToken } = await createUserWithRole({ roleCode: 'SECURITY_GUARD', societyId: society._id.toString() });
  const { user: resident, token: residentToken } = await createUserWithRole({ roleCode: 'OWNER', societyId: society._id.toString(), flatId: flat._id.toString() });
  await Resident.create({
    societyId: society._id,
    flatId: flat._id,
    userId: resident._id,
    name: resident.name,
    mobile: resident.mobile,
    email: resident.email,
    memberType: 'OWNER',
    loginAllowed: true,
    primaryContact: true,
    createdBy: admin._id,
  });

  const gate = await Gate.create({ societyId: society._id, name: 'Main Gate', code: 'MAIN-GATE', entryType: 'BOTH', createdBy: admin._id });
  await GuardAssignment.create({ societyId: society._id, userId: guard._id, gateIds: [gate._id], createdBy: admin._id, isActive: true });
  await SocietyModuleConfig.create({ societyId: society._id, moduleCode: 'VISITOR', isEnabled: true, enabledBy: admin._id });
  const photo = await FileAsset.create({
    societyId: society._id,
    uploadedBy: guard._id,
    moduleCode: 'VISITOR',
    entityType: 'VisitorPhoto',
    fileName: 'visitor-photo.jpg',
    originalName: 'visitor-photo.jpg',
    mimeType: 'image/jpeg',
    size: 1024,
    url: '/uploads/visitor-photo.jpg',
    accessLevel: 'PRIVATE',
  });

  return {
    society,
    admin,
    adminToken,
    tower,
    floor,
    flat,
    gate,
    guard,
    guardToken,
    resident,
    residentToken,
    photo,
  };
}
