import mongoose from 'mongoose';
import request from 'supertest';
import app from '../app';
import { connectTestDb, clearDb, createTestUser, seedRoles } from './helpers';
import { Society } from '../modules/society/society.model';
import { Device } from '../modules/device/device.model';
import { Resident } from '../modules/resident/resident.model';
import { Flat } from '../modules/flat/flat.model';
import { Tower } from '../modules/tower/tower.model';
import { Floor } from '../modules/floor/floor.model';
import { DeviceEventLog } from '../modules/device/deviceEventLog.model';

async function createAccessContext() {
  const societyId = new mongoose.Types.ObjectId();
  const { token, user } = await createTestUser({ societyId: societyId.toString() });
  const society = await Society.create({
    _id: societyId,
    name: 'Access Society', code: `JSO-A${Date.now()}`, address: 'Addr', city: 'City', state: 'State',
    pincode: '400001', contactPersonName: 'Admin', contactMobile: '9000000044', contactEmail: 'access@test.com', createdBy: user._id,
  });
  const tower = await Tower.create({ societyId: society._id, name: 'Tower A', code: 'TA', numberOfFloors: 1, createdBy: user._id });
  const floor = await Floor.create({ societyId: society._id, towerId: tower._id, floorNumber: 1, floorName: 'First', createdBy: user._id });
  const flat = await Flat.create({ societyId: society._id, towerId: tower._id, floorId: floor._id, flatNo: 'A-101', createdBy: user._id });
  const resident = await Resident.create({ societyId: society._id, flatId: flat._id, name: 'Riya Jain', mobile: '9000000055', memberType: 'TENANT', createdBy: user._id });
  const device = await Device.create({
    societyId: society._id, deviceName: 'Main Gate U5', deviceType: 'ACCESS_READER', deviceCode: `DEV-${Date.now()}`,
    apiKey: `key-${Date.now()}`, make: 'U5', createdBy: user._id,
  });
  return { token, user, society, resident, device };
}

beforeAll(async () => {
  await connectTestDb();
  await seedRoles();
});

afterEach(async () => {
  await clearDb();
  await seedRoles();
});

describe('Access Control module', () => {
  it('creates a zone and binds a device to it', async () => {
    const { token, society, device } = await createAccessContext();
    const zoneRes = await request(app).post('/api/access/zones').set('Authorization', `Bearer ${token}`).send({
      societyId: society._id, name: 'Main Gate', zoneType: 'GATE',
    });
    expect(zoneRes.status).toBe(201);

    const bindRes = await request(app).post(`/api/access/zones/${zoneRes.body.data._id}/bind-device`).set('Authorization', `Bearer ${token}`).send({
      deviceId: device._id,
    });
    expect(bindRes.status).toBe(201);

    const listRes = await request(app).get(`/api/access/society/${society._id}/zones`).set('Authorization', `Bearer ${token}`);
    expect(listRes.body.data[0].deviceCount).toBe(1);
  });

  it('resolves a synced device event to the mapped resident', async () => {
    const { token, society, resident, device } = await createAccessContext();
    const zoneRes = await request(app).post('/api/access/zones').set('Authorization', `Bearer ${token}`).send({
      societyId: society._id, name: 'Gym', zoneType: 'GYM',
    });
    await request(app).post(`/api/access/zones/${zoneRes.body.data._id}/bind-device`).set('Authorization', `Bearer ${token}`).send({ deviceId: device._id });

    await request(app).post('/api/access/credentials').set('Authorization', `Bearer ${token}`).send({
      societyId: society._id, residentId: resident._id, deviceId: device._id, deviceExternalUserId: 'u5-face-001',
    });

    const occurredAt = new Date('2026-08-15T08:00:00.000Z');
    await DeviceEventLog.create({
      deviceId: device._id, societyId: society._id, make: 'U5',
      parsedEvents: [{ deviceExternalUserId: 'u5-face-001', personName: 'Riya', timestamp: occurredAt, method: 'FACE', passed: true }],
    });

    const eventsRes = await request(app).get(`/api/access/society/${society._id}/events`).set('Authorization', `Bearer ${token}`);
    expect(eventsRes.status).toBe(200);
    expect(eventsRes.body.data).toHaveLength(1);
    expect(eventsRes.body.data[0].matchStatus).toBe('MATCHED');
    expect(eventsRes.body.data[0].residentId.name).toBe('Riya Jain');
  });

  it('leaves an event unresolved with no credential mapping, then resolves it manually', async () => {
    const { token, society, resident, device } = await createAccessContext();
    const zoneRes = await request(app).post('/api/access/zones').set('Authorization', `Bearer ${token}`).send({
      societyId: society._id, name: 'Pool', zoneType: 'POOL',
    });
    await request(app).post(`/api/access/zones/${zoneRes.body.data._id}/bind-device`).set('Authorization', `Bearer ${token}`).send({ deviceId: device._id });

    await DeviceEventLog.create({
      deviceId: device._id, societyId: society._id, make: 'U5',
      parsedEvents: [{ deviceExternalUserId: 'unknown-face-002', timestamp: new Date('2026-08-15T09:00:00.000Z'), method: 'FACE', passed: true }],
    });

    const eventsRes = await request(app).get(`/api/access/society/${society._id}/events`).set('Authorization', `Bearer ${token}`);
    expect(eventsRes.body.data[0].matchStatus).toBe('UNRESOLVED_CREDENTIAL');

    const resolveRes = await request(app).post(`/api/access/events/${eventsRes.body.data[0]._id}/resolve`).set('Authorization', `Bearer ${token}`).send({
      residentId: resident._id,
    });
    expect(resolveRes.status).toBe(200);
    expect(resolveRes.body.data.matchStatus).toBe('MATCHED');
  });

  it('does not duplicate access events on repeated syncs', async () => {
    const { token, society, resident, device } = await createAccessContext();
    const zoneRes = await request(app).post('/api/access/zones').set('Authorization', `Bearer ${token}`).send({
      societyId: society._id, name: 'Main Gate', zoneType: 'GATE',
    });
    await request(app).post(`/api/access/zones/${zoneRes.body.data._id}/bind-device`).set('Authorization', `Bearer ${token}`).send({ deviceId: device._id });
    await request(app).post('/api/access/credentials').set('Authorization', `Bearer ${token}`).send({
      societyId: society._id, residentId: resident._id, deviceId: device._id, deviceExternalUserId: 'u5-face-003',
    });
    await DeviceEventLog.create({
      deviceId: device._id, societyId: society._id, make: 'U5',
      parsedEvents: [{ deviceExternalUserId: 'u5-face-003', timestamp: new Date('2026-08-15T10:00:00.000Z'), method: 'FACE', passed: true }],
    });

    await request(app).post(`/api/access/society/${society._id}/sync`).set('Authorization', `Bearer ${token}`);
    const secondSync = await request(app).post(`/api/access/society/${society._id}/sync`).set('Authorization', `Bearer ${token}`);
    expect(secondSync.body.data.newEvents).toBe(0);

    const eventsRes = await request(app).get(`/api/access/society/${society._id}/events`).set('Authorization', `Bearer ${token}`);
    expect(eventsRes.body.data).toHaveLength(1);
  });

  it('rejects mapping a resident to a device user ID that is already mapped', async () => {
    const { token, society, resident, device, user } = await createAccessContext();
    await request(app).post('/api/access/credentials').set('Authorization', `Bearer ${token}`).send({
      societyId: society._id, residentId: resident._id, deviceId: device._id, deviceExternalUserId: 'u5-face-004',
    });
    const otherResident = await Resident.create({ societyId: society._id, flatId: resident.flatId, name: 'Other Resident', mobile: '9000000066', memberType: 'TENANT', createdBy: user._id });

    const res = await request(app).post('/api/access/credentials').set('Authorization', `Bearer ${token}`).send({
      societyId: society._id, residentId: otherResident._id, deviceId: device._id, deviceExternalUserId: 'u5-face-004',
    });
    expect(res.status).toBe(409);
  });
});
