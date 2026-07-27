import request from 'supertest';
import app from '../app';
import { clearDb, connectTestDb, seedRoles } from './helpers';
import { createResidentUserForFlat, createSamaFixture, createSamaFlat } from './sama.helpers';

beforeAll(async () => {
  await connectTestDb();
  await seedRoles();
});

afterEach(async () => {
  await clearDb();
  await seedRoles();
});

describe('SAMA native staff and household association flow', () => {
  it('creates staff, engagement, and multi-step household approvals with flat isolation', async () => {
    const fixture = await createSamaFixture();
    await request(app).post('/api/sama/staff-categories').set('Authorization', `Bearer ${fixture.adminToken}`).send({
      code: 'MAID',
      name: 'Maid',
      staffTypes: ['HOUSEHOLD_STAFF'],
      requiresSocietyApproval: false,
    });
    const flatA = await createSamaFlat(fixture, 'A-101');
    const flatB = await createSamaFlat(fixture, 'A-102');
    const { resident: residentA, token: ownerTokenA } = await createResidentUserForFlat(fixture, flatA, 'OWNER');
    const { token: ownerTokenB } = await createResidentUserForFlat(fixture, flatB, 'OWNER');

    const staffRes = await request(app).post('/api/sama/staff-profiles').set('Authorization', `Bearer ${fixture.adminToken}`).send({
      firstName: 'Seema',
      displayName: 'Seema Maid',
      mobile: '9000000009',
      staffType: 'HOUSEHOLD_STAFF',
      primaryCategory: 'MAID',
    });
    const staffId = staffRes.body.data._id;

    const engagementRes = await request(app).post('/api/sama/engagements').set('Authorization', `Bearer ${fixture.adminToken}`).send({
      staffProfileId: staffId,
      engagementType: 'HOUSEHOLD_DIRECT',
      employerType: 'HOUSEHOLD',
      employerFlatId: flatA._id.toString(),
      employerResidentId: residentA._id.toString(),
      startDate: '2026-07-25T00:00:00.000Z',
      paymentResponsibility: 'HOUSEHOLD',
    });
    const engagementId = engagementRes.body.data._id;

    const associationRes = await request(app).post('/api/sama/household-associations').set('Authorization', `Bearer ${fixture.adminToken}`).send({
      staffProfileId: staffId,
      engagementId,
      flatId: flatA._id.toString(),
      residentId: residentA._id.toString(),
      services: ['Cleaning', 'Utensils'],
      monthlyRatePaise: 900000,
    });
    const associationId = associationRes.body.data._id;

    const denyRes = await request(app).post(`/api/sama/household-associations/${associationId}/approve-resident`).set('Authorization', `Bearer ${ownerTokenB}`).send({});
    const residentApproveRes = await request(app).post(`/api/sama/household-associations/${associationId}/approve-resident`).set('Authorization', `Bearer ${ownerTokenA}`).send({});
    const societyApproveRes = await request(app).post(`/api/sama/household-associations/${associationId}/approve-society`).set('Authorization', `Bearer ${fixture.adminToken}`).send({});
    const ownerListRes = await request(app).get('/api/sama/household-associations').set('Authorization', `Bearer ${ownerTokenA}`);

    expect(staffRes.status).toBe(201);
    expect(staffRes.body.data.staffCode).toContain('SAMA-STF/');
    expect(engagementRes.status).toBe(201);
    expect(associationRes.status).toBe(201);
    expect(denyRes.status).toBe(403);
    expect(residentApproveRes.body.data.status).toBe('PENDING_SOCIETY_APPROVAL');
    expect(societyApproveRes.body.data.status).toBe('ACTIVE');
    expect(ownerListRes.status).toBe(200);
    expect(ownerListRes.body.data.items).toHaveLength(1);
    expect(ownerListRes.body.data.items[0].flatId).toBe(flatA._id.toString());
  });
});
