import mongoose from 'mongoose';
import request from 'supertest';
import app from '../app';
import { connectTestDb, clearDb, createTestUser, createSuperAdmin, seedRoles } from './helpers';
import { Society } from '../modules/society/society.model';
import { Device } from '../modules/device/device.model';

async function createDeviceFixture() {
  const societyId = new mongoose.Types.ObjectId();
  const { user } = await createTestUser({ societyId: societyId.toString() });
  const society = await Society.create({
    _id: societyId,
    name: 'Krishna Nagar', code: `JSO-P${Date.now()}`, address: 'Addr', city: 'City', state: 'State',
    pincode: '400001', contactPersonName: 'Admin', contactMobile: '9000000055', contactEmail: 'prov@test.com', createdBy: user._id,
  });
  const device = await Device.create({
    societyId: society._id, deviceName: 'Main Gate U5', deviceType: 'ACCESS_READER', deviceCode: 'GATE-U5-2',
    apiKey: `key-${Date.now()}`, make: 'U5', createdBy: user._id,
  });
  return { society, device };
}

beforeAll(async () => {
  await connectTestDb();
  await seedRoles();
});

afterEach(async () => {
  await clearDb();
  await seedRoles();
});

describe('Setup-wizard support endpoints', () => {
  it('verifies a real apiKey and returns human-readable device/society names', async () => {
    const { society, device } = await createDeviceFixture();
    const res = await request(app).get(`/api/devices/verify/${device.apiKey}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({ deviceName: 'Main Gate U5', societyName: society.name });
  });

  it('rejects an unknown apiKey during verification', async () => {
    const res = await request(app).get('/api/devices/verify/not-a-real-key');
    expect(res.status).toBe(401);
  });

  it('accepts a health report by apiKey and stores it on the device', async () => {
    const { device } = await createDeviceFixture();
    const res = await request(app).post(`/api/devices/heartbeat/${device.apiKey}`).send({
      firmwareVersion: '1.2.0', freeHeap: 180000, wifiRssi: -62, uptimeSeconds: 86400, resetReason: 'POWERON_RESET',
    });
    expect(res.status).toBe(200);

    const updated = await Device.findById(device._id);
    expect(updated?.firmwareVersion).toBe('1.2.0');
    expect(updated?.lastFreeHeap).toBe(180000);
    expect(updated?.lastWifiRssi).toBe(-62);
    expect(updated?.onlineStatus).toBe(true);
  });
});

describe('Firmware release registry', () => {
  it('lets a JENIX_SUPER_ADMIN register a release and a gateway fetch the latest one, unauthenticated', async () => {
    const { token } = await createSuperAdmin();

    await request(app).post('/api/devices/firmware').set('Authorization', `Bearer ${token}`).send({
      deviceModel: 'u5-gateway', version: '1.0.0', url: 'https://community.iotsoft.in/firmware/u5-gateway/1.0.0.bin', sha256: 'abc123',
    });
    const secondRelease = await request(app).post('/api/devices/firmware').set('Authorization', `Bearer ${token}`).send({
      deviceModel: 'u5-gateway', version: '1.1.0', url: 'https://community.iotsoft.in/firmware/u5-gateway/1.1.0.bin', sha256: 'def456',
    });
    expect(secondRelease.status).toBe(201);

    const latestRes = await request(app).get('/api/devices/firmware/u5-gateway/latest');
    expect(latestRes.status).toBe(200);
    expect(latestRes.body.data.version).toBe('1.1.0');
  });

  it('rejects a non-platform-admin (e.g. SOCIETY_ADMIN) from registering a firmware release', async () => {
    const { token } = await createTestUser();
    const res = await request(app).post('/api/devices/firmware').set('Authorization', `Bearer ${token}`).send({
      deviceModel: 'u5-gateway', version: '9.9.9', url: 'https://example.com/x.bin', sha256: 'x',
    });
    expect(res.status).toBe(403);
  });

  it('404s when no release exists yet for a model', async () => {
    const res = await request(app).get('/api/devices/firmware/never-released/latest');
    expect(res.status).toBe(404);
  });
});
