import request from 'supertest';
import app from '../app';
import { Device } from '../modules/device/device.model';
import { clearDb, connectTestDb, createUserWithRole, seedRoles } from './helpers';
import { createVisitorFixture } from './visitor.helpers';

beforeAll(async () => {
  await connectTestDb();
  await seedRoles();
});

afterEach(async () => {
  await clearDb();
  await seedRoles();
});

describe('Gate and Guard Assignment', () => {
  it('should create gates and guard assignments through the API', async () => {
    const fixture = await createVisitorFixture();

    const gateRes = await request(app)
      .post('/api/gates')
      .set('Authorization', `Bearer ${fixture.adminToken}`)
      .send({ societyId: fixture.society._id, name: 'Service Gate', entryType: 'SERVICE' });
    expect(gateRes.status).toBe(201);
    expect(gateRes.body.data.code).toBe('SERVICE-GATE');

    const { user: extraGuard } = await createUserWithRole({
      roleCode: 'SECURITY_GUARD',
      societyId: fixture.society._id.toString(),
    });

    const assignmentRes = await request(app)
      .post('/api/guard-assignments')
      .set('Authorization', `Bearer ${fixture.adminToken}`)
      .send({ societyId: fixture.society._id, userId: extraGuard._id, gateIds: [gateRes.body.data._id] });
    expect(assignmentRes.status).toBe(201);
    expect(assignmentRes.body.data.gateIds).toHaveLength(1);
  });

  it('should preview and apply legacy device gate mappings', async () => {
    const fixture = await createVisitorFixture();
    const device = await Device.create({
      societyId: fixture.society._id,
      deviceName: 'Legacy Camera',
      deviceType: 'GATE_CAMERA',
      deviceCode: 'LEGACY-CAM',
      gateName: 'Main Gate',
      createdBy: fixture.admin._id,
      apiKey: 'legacy-key',
    });

    const previewRes = await request(app)
      .get(`/api/gates/legacy-device-mappings?societyId=${fixture.society._id}`)
      .set('Authorization', `Bearer ${fixture.adminToken}`);
    expect(previewRes.status).toBe(200);
    expect(previewRes.body.data[0].matchedGateId).toBe(fixture.gate._id.toString());

    const linkRes = await request(app)
      .post(`/api/gates/${fixture.gate._id}/link-devices`)
      .set('Authorization', `Bearer ${fixture.adminToken}`)
      .send({ societyId: fixture.society._id, deviceIds: [device._id] });
    expect(linkRes.status).toBe(200);
    expect(linkRes.body.data.linkedCount).toBe(1);
  });
});
