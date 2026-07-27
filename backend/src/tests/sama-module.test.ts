import request from 'supertest';
import app from '../app';
import { clearDb, connectTestDb, createUserWithRole, seedRoles } from './helpers';
import { createSamaSociety, enableSamaModule } from './sama.helpers';

beforeAll(async () => {
  await connectTestDb();
  await seedRoles();
});

afterEach(async () => {
  await clearDb();
  await seedRoles();
});

describe('SAMA module access', () => {
  it('returns context when the module is enabled for the society', async () => {
    const society = await createSamaSociety();
    const { user, token } = await createUserWithRole({
      roleCode: 'SOCIETY_ADMIN',
      societyId: society._id.toString(),
    });
    await enableSamaModule(society._id.toString(), user._id.toString());

    const res = await request(app).get('/api/sama/context').set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.moduleCode).toBe('SAMA');
    expect(res.body.data.provider).toBe('EDGEFOLIO');
  });

  it('blocks access when the module is disabled for the society', async () => {
    const society = await createSamaSociety();
    const { token } = await createUserWithRole({
      roleCode: 'SOCIETY_ADMIN',
      societyId: society._id.toString(),
    });

    const res = await request(app).get('/api/sama/context').set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('SAMA_MODULE_NOT_ENABLED');
  });
});
