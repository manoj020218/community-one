import mongoose from 'mongoose';
import request from 'supertest';
import app from '../app';
import { connectTestDb, clearDb, createTestUser, seedRoles } from './helpers';
import { Society } from '../modules/society/society.model';
import { Device } from '../modules/device/device.model';

async function createDeviceFixture(overrides: Partial<{ make: string; apiKey: string }> = {}) {
  const societyId = new mongoose.Types.ObjectId();
  const { token, user } = await createTestUser({ societyId: societyId.toString() });
  const society = await Society.create({
    _id: societyId,
    name: 'Device Society', code: `JSO-D${Date.now()}`, address: 'Addr', city: 'City', state: 'State',
    pincode: '400001', contactPersonName: 'Admin', contactMobile: '9000000044', contactEmail: 'device@test.com', createdBy: user._id,
  });
  const device = await Device.create({
    societyId: society._id, deviceName: 'Main Gate U5', deviceType: 'ACCESS_READER', deviceCode: 'GATE-U5-1',
    apiKey: overrides.apiKey || `key-${Date.now()}`, make: overrides.make ?? 'U5', createdBy: user._id,
  });
  return { token, society, device };
}

beforeAll(async () => {
  await connectTestDb();
  await seedRoles();
});

afterEach(async () => {
  await clearDb();
  await seedRoles();
});

describe('Device push ingestion', () => {
  it('parses the vendor-documented {type:"note", data:{...}} envelope (API §3.5/3.6)', async () => {
    const { token, device } = await createDeviceFixture();

    const pushRes = await request(app).post(`/api/devices/push/${device.apiKey}`).send({
      type: 'note',
      data: { deviceId: 'ZY20240703003', employeeId: '1042', employeeName: 'Rahul', noteTime: '2026-08-13 09:15:00', noteWay: 1, notePass: 1 },
    });

    expect(pushRes.status).toBe(200);
    expect(pushRes.body.data.received).toBe(1);

    const logsRes = await request(app).get(`/api/devices/${device._id}/event-logs`).set('Authorization', `Bearer ${token}`);
    expect(logsRes.status).toBe(200);
    expect(logsRes.body.data).toHaveLength(1);
    const [event] = logsRes.body.data[0].parsedEvents;
    expect(event.deviceExternalUserId).toBe('1042');
    expect(event.personName).toBe('Rahul');
    expect(event.method).toBe('CARD');
    expect(event.passed).toBe(true);
  });

  it('treats a heartbeat push ({type:"heart"}) as zero events, not a parse failure', async () => {
    const { token, device } = await createDeviceFixture();
    const pushRes = await request(app).post(`/api/devices/push/${device.apiKey}`).send({ type: 'heart', device_id: 'ZY20240703003' });
    expect(pushRes.status).toBe(200);
    expect(pushRes.body.data.received).toBe(0);
    expect(pushRes.body.data.warning).toBeUndefined();

    const logsRes = await request(app).get(`/api/devices/${device._id}/event-logs`).set('Authorization', `Bearer ${token}`);
    expect(logsRes.body.data[0].warning).toBeUndefined();
  });

  it('falls back to flat-field parsing for a batch push with no type/data envelope', async () => {
    const { token, device } = await createDeviceFixture();

    const pushRes = await request(app).post(`/api/devices/push/${device.apiKey}`).send({
      data: [{ userid: '1042', name: 'Rahul', checkin_time: '2026-08-13 09:15:00', noteWay: '1', notePass: '1' }],
    });

    expect(pushRes.status).toBe(200);
    expect(pushRes.body.data.received).toBe(1);

    const logsRes = await request(app).get(`/api/devices/${device._id}/event-logs`).set('Authorization', `Bearer ${token}`);
    expect(logsRes.status).toBe(200);
    expect(logsRes.body.data).toHaveLength(1);
    const [event] = logsRes.body.data[0].parsedEvents;
    expect(event.deviceExternalUserId).toBe('1042');
    expect(event.method).toBe('CARD');
    expect(event.passed).toBe(true);
  });

  it('rejects a push with an unknown API key', async () => {
    await createDeviceFixture();
    const res = await request(app).post('/api/devices/push/not-a-real-key').send({ data: [] });
    expect(res.status).toBe(401);
  });

  it('logs a warning instead of crashing when no adapter is registered for the device make', async () => {
    const { device } = await createDeviceFixture({ make: 'GENERIC' });
    const res = await request(app).post(`/api/devices/push/${device.apiKey}`).send({ anything: true });
    expect(res.status).toBe(200);
    expect(res.body.data.received).toBe(0);
    expect(res.body.data.warning).toMatch(/No adapter registered/);
  });

  it('marks the device online after a push, same as a heartbeat would', async () => {
    const { device } = await createDeviceFixture();
    await request(app).post(`/api/devices/push/${device.apiKey}`).send({ data: [{ userid: '5', checkin_time: '2026-08-13 08:00:00' }] });
    const updated = await Device.findById(device._id);
    expect(updated?.onlineStatus).toBe(true);
  });

  it('strips photo data from the stored rawBody regardless of what the gateway sends, but still parses fields correctly', async () => {
    const { token, device } = await createDeviceFixture();
    const hugePic = 'a'.repeat(5000);

    await request(app).post(`/api/devices/push/${device.apiKey}`).send({
      data: [{ userid: '1042', name: 'Rahul', checkin_time: '2026-08-13 09:15:00', pic_large: hugePic }],
    });

    const logsRes = await request(app).get(`/api/devices/${device._id}/event-logs`).set('Authorization', `Bearer ${token}`);
    const log = logsRes.body.data[0];
    expect(log.rawBody.data[0].pic_large).toBe('[stripped: image data not stored]');
    expect(JSON.stringify(log.rawBody)).not.toContain(hugePic);
    expect(log.parsedEvents[0].deviceExternalUserId).toBe('1042');
    expect(log.parsedEvents[0].personName).toBe('Rahul');
  });
});
