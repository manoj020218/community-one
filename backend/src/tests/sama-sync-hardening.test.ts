import request from 'supertest';
import app from '../app';
import { Device } from '../modules/device/device.model';
import { Notification } from '../modules/notification/notification.model';
import { SamaSource } from '../modules/sama/samaSource.model';
import { SamaSyncRun } from '../modules/sama/samaSyncRun.model';
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

describe('SAMA sync recovery and access exception handling', () => {
  it('retries scheduled sync failures, exposes sync health, and resolves access exceptions', async () => {
    const fixture = await createSamaFixture();
    const device = await Device.create({
      societyId: fixture.society._id,
      deviceName: 'Side Gate Reader',
      deviceType: 'ACCESS_READER',
      deviceCode: 'SAMA-GATE-02',
      apiKey: 'gate-key-02',
      createdBy: fixture.admin._id,
      isActive: true,
      onlineStatus: false,
      status: 'ACTIVE',
    });

    await request(app).patch('/api/sama/source').set('Authorization', `Bearer ${fixture.adminToken}`).send({
      baseUrl: 'http://edgefolio.local',
      accessToken: 'edge-token',
      apiPrefix: '/api/v1',
      syncScheduleEnabled: true,
      syncIntervalMinutes: 5,
      syncRetryLimit: 2,
      staleAfterMinutes: 15,
      scheduledSyncTypes: ['EMPLOYEES'],
    });

    const fetchMock = jest.spyOn(globalThis, 'fetch')
      .mockRejectedValueOnce(new Error('offline'))
      .mockRejectedValueOnce(new Error('offline'));

    const scheduledRes = await request(app).post('/api/sama/sync/run-due').set('Authorization', `Bearer ${fixture.adminToken}`).send({});
    const healthRes = await request(app).get('/api/sama/sync-health').set('Authorization', `Bearer ${fixture.adminToken}`);
    const failedRun = await SamaSyncRun.findOne({ societyId: fixture.society._id, status: 'FAILED', triggerMode: 'SCHEDULED' }).sort({ createdAt: -1 }).orFail();

    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [{ id: 'emp-88', empCode: 'E088', name: 'Retry User', department: 'Ops', salary: 1000 }] }),
    } as Response);

    const retryRes = await request(app).post(`/api/sama/sync-runs/${failedRun._id.toString()}/retry`).set('Authorization', `Bearer ${fixture.adminToken}`).send({});

    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [{ id: 501, devId: 'M68-UNBOUND', kind: 'barcode', receivedAt: '2026-07-27T12:00:00.000Z' }] }),
    } as Response);

    const accessSyncRes = await request(app).post('/api/sama/sync/access-events').set('Authorization', `Bearer ${fixture.adminToken}`).send({ limit: 20 });
    const unresolvedRes = await request(app).get('/api/sama/access-events').query({ exceptionStatus: 'UNMATCHED_DEVICE' }).set('Authorization', `Bearer ${fixture.adminToken}`);

    const bindingRes = await request(app).post('/api/sama/device-bindings').set('Authorization', `Bearer ${fixture.adminToken}`).send({
      externalDeviceType: 'M68',
      externalDeviceId: 'M68-UNBOUND',
      externalDeviceName: 'Unbound Side Gate',
      jenixDeviceId: device._id.toString(),
    });

    const resolveRes = await request(app).patch(`/api/sama/access-events/${unresolvedRes.body.data.items[0]._id}/resolve`).set('Authorization', `Bearer ${fixture.adminToken}`).send({
      action: 'RESOLVE',
      bindingId: bindingRes.body.data._id,
      resolutionNotes: 'Mapped during recovery review',
    });
    const exceptionReportRes = await request(app).get('/api/sama/reports/access-exceptions').query({ exceptionStatus: 'RESOLVED' }).set('Authorization', `Bearer ${fixture.adminToken}`);
    const syncExportRes = await request(app).get('/api/sama/reports/export').query({ reportType: 'SYNC_HEALTH' }).set('Authorization', `Bearer ${fixture.adminToken}`);

    const source = await SamaSource.findOne({ societyId: fixture.society._id }).orFail();
    const notifications = await Notification.find({ userId: fixture.admin._id }).sort({ createdAt: 1 }).lean();

    expect(scheduledRes.status).toBe(200);
    expect(scheduledRes.body.data.failedSyncCount).toBe(1);
    expect(scheduledRes.body.data.attentionSocietyCount).toBe(1);
    expect(fetchMock).toHaveBeenCalledTimes(4);
    expect(healthRes.body.data.overallStatus).toBe('ATTENTION');
    expect(healthRes.body.data.staleSyncTypes).toContain('EMPLOYEES');
    expect(retryRes.status).toBe(200);
    expect(retryRes.body.data.importedCount).toBe(1);
    expect(source.consecutiveSyncFailures).toBe(0);
    expect(source.lastSuccessfulSyncAt).toBeTruthy();
    expect(accessSyncRes.body.data.unresolvedBindingCount).toBe(1);
    expect(accessSyncRes.body.data.exceptionCount).toBe(1);
    expect(unresolvedRes.body.data.items).toHaveLength(1);
    expect(resolveRes.body.data.exceptionStatus).toBe('RESOLVED');
    expect(resolveRes.body.data.jenixDeviceId).toBe(device._id.toString());
    expect(exceptionReportRes.body.data.summary.RESOLVED).toBe(1);
    expect(syncExportRes.body.data.content).toContain('syncType');
    expect(notifications.map((item) => item.title)).toEqual([
      'SAMA sync requires attention',
      'SAMA access exceptions detected',
    ]);
  });
});
