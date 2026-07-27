import request from 'supertest';
import app from '../app';
import { Device } from '../modules/device/device.model';
import { SamaSource } from '../modules/sama/samaSource.model';
import { clearDb, connectTestDb, seedRoles } from './helpers';
import { createSamaFixture } from './sama.helpers';

beforeAll(async () => {
  await connectTestDb();
  await seedRoles();
});

afterEach(async () => {
  jest.restoreAllMocks();
  await clearDb();
  await seedRoles();
});

describe('SAMA scheduled sync and access event bridge', () => {
  it('discovers external devices, binds them, syncs access events, and runs scheduled access-event syncs', async () => {
    const fixture = await createSamaFixture();
    const device = await Device.create({
      societyId: fixture.society._id,
      deviceName: 'Main Gate Reader',
      deviceType: 'ACCESS_READER',
      deviceCode: 'SAMA-GATE-01',
      apiKey: 'device-key',
      createdBy: fixture.admin._id,
      isActive: true,
      onlineStatus: false,
      status: 'ACTIVE',
    });

    const sourceRes = await request(app).patch('/api/sama/source').set('Authorization', `Bearer ${fixture.adminToken}`).send({
      baseUrl: 'http://edgefolio.local',
      accessToken: 'edge-token',
      apiPrefix: '/api/v1',
      syncScheduleEnabled: true,
      syncIntervalMinutes: 5,
      scheduledSyncTypes: ['ACCESS_EVENTS'],
    });

    const fetchMock = jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [{ id: 1, devId: 'M68-ENTRY-01', name: 'M68 Entry Gate', online: true }] }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [{ id: 10, deviceName: 'U5 Lobby', deviceSn: 'U5-LOBBY-01', status: 'online' }] }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [{ id: 101, devId: 'M68-ENTRY-01', kind: 'barcode', hasPayload: true, receivedAt: '2026-07-26T10:30:00.000Z' }] }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [{ id: 102, devId: 'M68-ENTRY-01', kind: 'operation', hasPayload: false, receivedAt: '2026-07-26T10:35:00.000Z' }] }),
      } as Response);

    const externalRes = await request(app).get('/api/sama/external-devices').set('Authorization', `Bearer ${fixture.adminToken}`);
    const bindingRes = await request(app).post('/api/sama/device-bindings').set('Authorization', `Bearer ${fixture.adminToken}`).send({
      externalDeviceType: 'M68',
      externalDeviceId: 'M68-ENTRY-01',
      externalDeviceName: 'M68 Entry Gate',
      jenixDeviceId: device._id.toString(),
    });
    const accessSyncRes = await request(app).post('/api/sama/sync/access-events').set('Authorization', `Bearer ${fixture.adminToken}`).send({ limit: 50 });
    const accessListRes = await request(app).get('/api/sama/access-events').set('Authorization', `Bearer ${fixture.adminToken}`);
    const scheduledRes = await request(app).post('/api/sama/sync/run-due').set('Authorization', `Bearer ${fixture.adminToken}`).send({});
    const syncRunListRes = await request(app).get('/api/sama/sync-runs').set('Authorization', `Bearer ${fixture.adminToken}`);

    const source = await SamaSource.findOne({ societyId: fixture.society._id });

    expect(sourceRes.status).toBe(200);
    expect(sourceRes.body.data.syncScheduleEnabled).toBe(true);
    expect(sourceRes.body.data.scheduledSyncTypes).toEqual(['ACCESS_EVENTS']);
    expect(externalRes.status).toBe(200);
    expect(externalRes.body.data).toHaveLength(2);
    expect(externalRes.body.data[0].externalDeviceId).toBe('M68-ENTRY-01');
    expect(bindingRes.status).toBe(201);
    expect(accessSyncRes.status).toBe(200);
    expect(accessSyncRes.body.data.importedCount).toBe(1);
    expect(accessSyncRes.body.data.unresolvedBindingCount).toBe(0);
    expect(accessListRes.status).toBe(200);
    expect(accessListRes.body.data.items).toHaveLength(1);
    expect(accessListRes.body.data.items[0].eventType).toBe('CREDENTIAL_SCAN');
    expect(accessListRes.body.data.items[0].jenixDeviceId).toBe(device._id.toString());
    expect(scheduledRes.status).toBe(200);
    expect(scheduledRes.body.data.dueSocietyCount).toBe(1);
    expect(scheduledRes.body.data.executedSyncCount).toBe(1);
    expect(syncRunListRes.status).toBe(200);
    expect(syncRunListRes.body.data.items.some((item: any) => item.triggerMode === 'SCHEDULED' && item.syncType === 'ACCESS_EVENTS')).toBe(true);
    expect(source?.lastAccessEventSyncAt).toBeTruthy();
    expect(source?.lastScheduledSyncAt).toBeTruthy();
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });
});
