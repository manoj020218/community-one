import mongoose from 'mongoose';
import request from 'supertest';
import app from '../app';
import { connectTestDb, clearDb, createTestUser, createUserWithRole, seedRoles } from './helpers';
import { Society } from '../modules/society/society.model';
import { Tower } from '../modules/tower/tower.model';
import { Flat } from '../modules/flat/flat.model';
import { Resident } from '../modules/resident/resident.model';
import { Floor } from '../modules/floor/floor.model';
import { PERMISSIONS } from '../config/constants';

async function createLeaseContext() {
  const societyId = new mongoose.Types.ObjectId();
  const { token, user } = await createTestUser({ societyId: societyId.toString() });
  const society = await Society.create({
    _id: societyId,
    name: 'Lease Society', code: `JSO-L${Date.now()}`, address: 'Addr', city: 'City', state: 'State',
    pincode: '400001', contactPersonName: 'Admin', contactMobile: '9000000011', contactEmail: 'lease@test.com', createdBy: user._id,
  });
  const tower = await Tower.create({ societyId: society._id, name: 'Tower L', code: 'TL', numberOfFloors: 1, createdBy: user._id });
  const floor = await Floor.create({ societyId: society._id, towerId: tower._id, floorNumber: 1, floorName: 'First', createdBy: user._id });
  const flat = await Flat.create({ societyId: society._id, towerId: tower._id, floorId: floor._id, flatNo: 'L-101', createdBy: user._id });
  const tenant = await Resident.create({ societyId: society._id, flatId: flat._id, name: 'Tenant One', mobile: '9000000022', memberType: 'TENANT', createdBy: user._id });
  return { token, user, society, flat, tenant };
}

beforeAll(async () => {
  await connectTestDb();
  await seedRoles();
});

afterEach(async () => {
  await clearDb();
  await seedRoles();
});

describe('Lease module', () => {
  it('creates a lease and marks the flat as tenant occupied', async () => {
    const { token, society, flat, tenant } = await createLeaseContext();
    const res = await request(app).post('/api/leases').set('Authorization', `Bearer ${token}`).send({
      societyId: society._id, flatId: flat._id, residentId: tenant._id, rentAmount: 12000, depositAmount: 24000,
      billingDay: 5, startDate: '2026-08-12', endDate: '2027-08-11', noticePeriodDays: 30,
    });

    expect(res.status).toBe(201);
    expect(res.body.data.flatId.flatNo).toBe('L-101');
    expect(res.body.data.residentId.name).toBe('Tenant One');
    expect((await Flat.findById(flat._id))?.occupancyStatus).toBe('TENANT_OCCUPIED');
  });

  it('rejects a second active lease on the same flat', async () => {
    const { token, society, flat, tenant, user } = await createLeaseContext();
    await request(app).post('/api/leases').set('Authorization', `Bearer ${token}`).send({
      societyId: society._id, flatId: flat._id, residentId: tenant._id, rentAmount: 12000, billingDay: 5,
      startDate: '2026-08-12', endDate: '2027-08-11',
    });
    const secondTenant = await Resident.create({ societyId: society._id, flatId: flat._id, name: 'Tenant Two', mobile: '9000000033', memberType: 'TENANT', createdBy: user._id });

    const res = await request(app).post('/api/leases').set('Authorization', `Bearer ${token}`).send({
      societyId: society._id, flatId: flat._id, residentId: secondTenant._id, rentAmount: 15000, billingDay: 5,
      startDate: '2026-08-15', endDate: '2027-08-14',
    });

    expect(res.status).toBe(409);
  });

  it('terminates a lease and marks the flat vacant when no other active lease remains', async () => {
    const { token, society, flat, tenant } = await createLeaseContext();
    const createRes = await request(app).post('/api/leases').set('Authorization', `Bearer ${token}`).send({
      societyId: society._id, flatId: flat._id, residentId: tenant._id, rentAmount: 12000, billingDay: 5,
      startDate: '2026-08-12', endDate: '2027-08-11',
    });

    const res = await request(app).post(`/api/leases/${createRes.body.data._id}/terminate`).set('Authorization', `Bearer ${token}`).send({
      terminationDate: '2026-10-01', reason: 'Tenant moved out', depositRefundAmount: 20000,
    });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('TERMINATED');
    expect((await Flat.findById(flat._id))?.occupancyStatus).toBe('VACANT');
  });

  it('blocks tenant-scoped lease reads outside the actor society even if lease.read is granted', async () => {
    const { token, society } = await createLeaseContext();
    const otherSocietyId = '66ba87d5d9eeb2c0f0d2e7b1';
    const { token: tenantToken } = await createUserWithRole({
      roleCode: 'TENANT',
      societyId: otherSocietyId,
      permissions: [...new Set([PERMISSIONS.LEASE_READ])],
    });

    await request(app).get(`/api/leases/society/${society._id}`).set('Authorization', `Bearer ${token}`);
    const res = await request(app).get(`/api/leases/society/${society._id}`).set('Authorization', `Bearer ${tenantToken}`);

    expect(res.status).toBe(403);
  });
});
