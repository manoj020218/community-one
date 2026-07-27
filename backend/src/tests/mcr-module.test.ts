import request from 'supertest';
import app from '../app';
import { connectTestDb, clearDb, createSuperAdmin, createUserWithRole, seedRoles } from './helpers';
import { Society } from '../modules/society/society.model';
import { SocietyModuleConfig } from '../modules/moduleRegistry/moduleRegistry.model';

beforeAll(async () => {
  await connectTestDb();
  await seedRoles();
});

afterEach(async () => {
  await clearDb();
  await seedRoles();
});

async function createSociety() {
  const { user } = await createSuperAdmin();
  return Society.create({
    name: 'MCR Society',
    code: `JSO-MCR-${Date.now().toString().slice(-4)}`,
    address: '123 Test Road',
    city: 'Mumbai',
    state: 'Maharashtra',
    pincode: '400001',
    contactPersonName: 'MCR Owner',
    contactMobile: '9000000001',
    contactEmail: 'mcr@test.com',
    createdBy: user._id,
    enabledModules: ['CORE', 'MCR'],
    status: 'ACTIVE',
    billingStatus: 'ACTIVE',
  });
}

describe('MCR module access', () => {
  it('returns context when the module is enabled for the society', async () => {
    const society = await createSociety();
    const { user, token } = await createUserWithRole({ roleCode: 'SOCIETY_ADMIN', societyId: society._id.toString() });
    await SocietyModuleConfig.create({ societyId: society._id, moduleCode: 'MCR', isEnabled: true, enabledBy: user._id });

    const res = await request(app).get('/api/mcr/context').set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.moduleCode).toBe('MCR');
    expect(res.body.data.enabled).toBe(true);
    expect(res.body.data.societyId).toBe(society._id.toString());
  });

  it('blocks access when the module is disabled for the society', async () => {
    const society = await createSociety();
    const { token } = await createUserWithRole({ roleCode: 'SOCIETY_ADMIN', societyId: society._id.toString() });

    const res = await request(app).get('/api/mcr/context').set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('MCR_MODULE_NOT_ENABLED');
  });
});
