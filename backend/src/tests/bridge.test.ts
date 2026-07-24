process.env.BRIDGE_SECRET = 'test-bridge-secret-1234567890';

import request from 'supertest';
import app from '../app';
import { connectTestDb, clearDb, seedRoles } from './helpers';
import { User } from '../modules/user/user.model';
import { Society } from '../modules/society/society.model';

beforeAll(async () => {
  await connectTestDb();
  await seedRoles();
});

afterEach(async () => {
  await clearDb();
  await seedRoles();
});

const validBody = {
  societyName: 'Green Valley',
  address: '123 Main St',
  city: 'Mumbai',
  state: 'Maharashtra',
  pincode: '400001',
  contactPersonName: 'Raj Sharma',
  email: 'raj@greenvalley.com',
  mobile: '9876543210',
};

describe('Bridge provision', () => {
  it('rejects requests without a valid X-Bridge-Secret', async () => {
    const res = await request(app).post('/api/bridge/provision').send(validBody);
    expect(res.status).toBe(401);
  });

  it('rejects requests with the wrong secret', async () => {
    const res = await request(app)
      .post('/api/bridge/provision')
      .set('X-Bridge-Secret', 'wrong-secret')
      .send(validBody);
    expect(res.status).toBe(401);
  });

  it('provisions a society + admin user with a valid secret', async () => {
    const res = await request(app)
      .post('/api/bridge/provision')
      .set('X-Bridge-Secret', 'test-bridge-secret-1234567890')
      .send(validBody);

    expect(res.status).toBe(200);
    expect(res.body.data.adminEmail).toBe('raj@greenvalley.com');
    expect(res.body.data.tempPassword).toBeDefined();
    expect(res.body.data.societyCode).toMatch(/^JSO-/);

    const user = await User.findOne({ email: 'raj@greenvalley.com' });
    expect(user).not.toBeNull();
    expect(user!.roleCode).toBe('SOCIETY_ADMIN');

    const society = await Society.findOne({ code: res.body.data.societyCode });
    expect(society).not.toBeNull();
    expect(String(user!.societyId)).toBe(String(society!._id));
  });

  it('rejects missing required fields', async () => {
    const res = await request(app)
      .post('/api/bridge/provision')
      .set('X-Bridge-Secret', 'test-bridge-secret-1234567890')
      .send({ societyName: 'Green Valley' });
    expect(res.status).toBe(400);
  });

  it('returns 409 when the admin email already exists', async () => {
    await request(app)
      .post('/api/bridge/provision')
      .set('X-Bridge-Secret', 'test-bridge-secret-1234567890')
      .send(validBody);

    const res = await request(app)
      .post('/api/bridge/provision')
      .set('X-Bridge-Secret', 'test-bridge-secret-1234567890')
      .send({ ...validBody, societyName: 'Different Society' });

    expect(res.status).toBe(409);
  });
});
