import request from 'supertest';
import app from '../app';
import { AccessCredential } from '../modules/sama/accessCredential.model';
import { clearDb, connectTestDb, createUserWithRole, seedRoles } from './helpers';
import { createSamaFixture } from './sama.helpers';

beforeAll(async () => {
  await connectTestDb();
  await seedRoles();
});

afterEach(async () => {
  await clearDb();
  await seedRoles();
});

describe('SAMA service-provider, work-order, and access foundation flow', () => {
  it('creates provider operations, links a work-order access policy, and revokes credentials', async () => {
    const fixture = await createSamaFixture();
    const { token: managerToken } = await createUserWithRole({
      roleCode: 'FACILITY_MANAGER',
      societyId: fixture.society._id.toString(),
    });

    const providerRes = await request(app).post('/api/sama/service-providers').set('Authorization', `Bearer ${fixture.adminToken}`).send({
      displayName: 'FixFast Services',
      providerType: 'COMPANY',
      contactPersonName: 'Arun',
      mobile: '9000000011',
      serviceCategories: ['PLUMBING', 'REPAIRS'],
    });
    const providerId = providerRes.body.data._id;

    const workOrderRes = await request(app).post('/api/sama/work-orders').set('Authorization', `Bearer ${managerToken}`).send({
      title: 'Repair overhead tank valve',
      category: 'PLUMBING',
      priority: 'HIGH',
    });
    const workOrderId = workOrderRes.body.data._id;

    const policyRes = await request(app).post('/api/sama/access-policies').set('Authorization', `Bearer ${fixture.adminToken}`).send({
      name: 'Valve repair temporary access',
      subjectType: 'WORK_ORDER',
      subjectId: workOrderId,
      accessMode: 'ONE_TIME_WINDOW',
      allowedDaysOfWeek: ['MON'],
      validFrom: '2026-07-27T08:00:00.000Z',
      validUntil: '2026-07-27T18:00:00.000Z',
    });
    const policyId = policyRes.body.data._id;

    const credentialRes = await request(app).post('/api/sama/credentials').set('Authorization', `Bearer ${fixture.adminToken}`).send({
      subjectType: 'WORK_ORDER',
      subjectId: workOrderId,
      accessPolicyId: policyId,
      credentialType: 'RFID',
      credentialLabel: 'Plumber entry card',
      credentialValue: 'RF-123456',
    });
    const credentialId = credentialRes.body.data._id;

    const assignRes = await request(app).patch(`/api/sama/work-orders/${workOrderId}/assign`).set('Authorization', `Bearer ${managerToken}`).send({
      assignedServiceProviderId: providerId,
      accessPolicyId: policyId,
      scheduledStartAt: '2026-07-27T09:00:00.000Z',
      scheduledEndAt: '2026-07-27T12:00:00.000Z',
    });
    const completeRes = await request(app).patch(`/api/sama/work-orders/${workOrderId}/complete`).set('Authorization', `Bearer ${managerToken}`).send({
      completionNotes: 'Valve replaced and line tested',
    });

    const providerListRes = await request(app).get('/api/sama/service-providers').set('Authorization', `Bearer ${managerToken}`);
    const workOrderListRes = await request(app).get('/api/sama/work-orders').set('Authorization', `Bearer ${managerToken}`);
    const policyListRes = await request(app).get('/api/sama/access-policies').set('Authorization', `Bearer ${fixture.adminToken}`);
    const credentialListRes = await request(app).get('/api/sama/credentials').set('Authorization', `Bearer ${fixture.adminToken}`);
    const revokeRes = await request(app).patch(`/api/sama/credentials/${credentialId}/revoke`).set('Authorization', `Bearer ${fixture.adminToken}`).send({});

    const credentialDoc = await AccessCredential.findById(credentialId);

    expect(providerRes.status).toBe(201);
    expect(providerRes.body.data.providerCode).toContain('SAMA-SP/');
    expect(workOrderRes.status).toBe(201);
    expect(workOrderRes.body.data.workOrderCode).toContain('SAMA-WO/');
    expect(policyRes.status).toBe(201);
    expect(credentialRes.status).toBe(201);
    expect(credentialRes.body.data.credentialValue).toBeUndefined();
    expect(credentialRes.body.data.identifierHash).toBeUndefined();
    expect(credentialRes.body.data.identifierLast4).toBe('3456');
    expect(assignRes.body.data.status).toBe('ASSIGNED');
    expect(completeRes.body.data.status).toBe('COMPLETED');
    expect(providerListRes.body.data.items).toHaveLength(1);
    expect(workOrderListRes.body.data.items).toHaveLength(1);
    expect(policyListRes.body.data.items).toHaveLength(1);
    expect(credentialListRes.body.data.items).toHaveLength(1);
    expect(revokeRes.body.data.status).toBe('REVOKED');
    expect(credentialDoc?.identifierHash).toBeTruthy();
  });
});
