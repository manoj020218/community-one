import request from 'supertest';
import app from '../app';
import { Flat } from '../modules/flat/flat.model';
import { SocietyModuleConfig } from '../modules/moduleRegistry/moduleRegistry.model';
import { Resident } from '../modules/resident/resident.model';
import { Society } from '../modules/society/society.model';
import { VisitorRequest } from '../modules/visitor/visitor.model';
import { visitorExpiryService } from '../modules/visitor/visitor.expiry.service';
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

describe('Visitor Security and Expiry', () => {
  it('should prevent a resident from another flat from approving the request', async () => {
    const fixture = await createVisitorFixture();
    const otherFlat = await Flat.create({ societyId: fixture.society._id, towerId: fixture.tower._id, floorId: fixture.floor._id, flatNo: 'A-102', createdBy: fixture.admin._id });
    const { token: otherResidentToken, user: otherResident } = await createUserWithRole({ roleCode: 'OWNER', societyId: fixture.society._id.toString(), flatId: otherFlat._id.toString() });
    await Resident.create({ societyId: fixture.society._id, flatId: otherFlat._id, userId: otherResident._id, name: otherResident.name, mobile: otherResident.mobile, email: otherResident.email, memberType: 'OWNER', loginAllowed: true, primaryContact: true, createdBy: fixture.admin._id });

    const createRes = await request(app)
      .post('/api/visitor/requests')
      .set('Authorization', `Bearer ${fixture.guardToken}`)
      .send({ flatId: fixture.flat._id, gateId: fixture.gate._id, visitorName: 'Protected Visitor', visitorMobile: '9000011111', visitorPhotoFileId: fixture.photo._id });
    const approveRes = await request(app)
      .post(`/api/visitor/requests/${createRes.body.data._id}/approve`)
      .set('Authorization', `Bearer ${otherResidentToken}`)
      .send({});
    expect(approveRes.status).toBe(403);
  });

  it('should prevent a guard without an assignment from creating gate-scoped requests', async () => {
    const fixture = await createVisitorFixture();
    const { token: unassignedGuardToken } = await createUserWithRole({ roleCode: 'SECURITY_GUARD', societyId: fixture.society._id.toString() });

    const createRes = await request(app)
      .post('/api/visitor/requests')
      .set('Authorization', `Bearer ${unassignedGuardToken}`)
      .send({ flatId: fixture.flat._id, gateId: fixture.gate._id, visitorName: 'Blocked Visitor', visitorMobile: '9000022222', visitorPhotoFileId: fixture.photo._id });
    expect(createRes.status).toBe(403);
  });

  it('should expire pending visitor requests in the expiry service', async () => {
    const fixture = await createVisitorFixture();
    const createRes = await request(app)
      .post('/api/visitor/requests')
      .set('Authorization', `Bearer ${fixture.guardToken}`)
      .send({ flatId: fixture.flat._id, gateId: fixture.gate._id, visitorName: 'Expiring Visitor', visitorMobile: '9000033333', visitorPhotoFileId: fixture.photo._id });
    await VisitorRequest.findByIdAndUpdate(createRes.body.data._id, { expiresAt: new Date(Date.now() - 60000) });

    const processed = await visitorExpiryService.expirePendingBatch(10);
    const requestDoc = await VisitorRequest.findById(createRes.body.data._id);
    expect(processed).toBe(1);
    expect(requestDoc?.status).toBe('EXPIRED');
  });

  it('should prevent a society-wide viewer from a different society from seeing the request', async () => {
    const fixture = await createVisitorFixture();
    const createRes = await request(app)
      .post('/api/visitor/requests')
      .set('Authorization', `Bearer ${fixture.guardToken}`)
      .send({ flatId: fixture.flat._id, gateId: fixture.gate._id, visitorName: 'Cross Society Visitor', visitorMobile: '9000044444', visitorPhotoFileId: fixture.photo._id });

    const otherSociety = await Society.create({
      name: 'Other Society', code: `JSO-OTH-${Date.now().toString().slice(-4)}`, address: '1 Other Rd', city: 'Pune', state: 'Maharashtra', pincode: '411001',
      contactPersonName: 'Other Owner', contactMobile: '9000000002', contactEmail: 'other@test.com', createdBy: fixture.admin._id,
      enabledModules: ['CORE', 'VISITOR'], status: 'ACTIVE', billingStatus: 'ACTIVE',
    });
    const { user: otherAdmin, token: otherAdminToken } = await createUserWithRole({ roleCode: 'SOCIETY_ADMIN', societyId: otherSociety._id.toString() });
    await SocietyModuleConfig.create({ societyId: otherSociety._id, moduleCode: 'VISITOR', isEnabled: true, enabledBy: otherAdmin._id });

    const getRes = await request(app)
      .get(`/api/visitor/requests/${createRes.body.data._id}`)
      .set('Authorization', `Bearer ${otherAdminToken}`);
    expect(getRes.status).toBe(404);
  });

  it('should let only the first of two simultaneous approvals succeed', async () => {
    const fixture = await createVisitorFixture();
    const createRes = await request(app)
      .post('/api/visitor/requests')
      .set('Authorization', `Bearer ${fixture.guardToken}`)
      .send({ flatId: fixture.flat._id, gateId: fixture.gate._id, visitorName: 'Race Visitor', visitorMobile: '9000055555', visitorPhotoFileId: fixture.photo._id });
    const requestId = createRes.body.data._id;

    const [first, second] = await Promise.all([
      request(app).post(`/api/visitor/requests/${requestId}/approve`).set('Authorization', `Bearer ${fixture.residentToken}`).send({}),
      request(app).post(`/api/visitor/requests/${requestId}/reject`).set('Authorization', `Bearer ${fixture.residentToken}`).send({}),
    ]);

    const statuses = [first.status, second.status].sort();
    expect(statuses).toEqual([200, 409]);
    expect(await VisitorRequest.countDocuments({ _id: requestId, status: 'APPROVED' }) + await VisitorRequest.countDocuments({ _id: requestId, status: 'REJECTED' })).toBe(1);
  });

  it('should cap visitor requests per mobile number per hour', async () => {
    const fixture = await createVisitorFixture();
    await request(app)
      .patch('/api/visitor/settings')
      .set('Authorization', `Bearer ${fixture.adminToken}`)
      .send({ societyId: fixture.society._id, maxRequestsPerMobilePerHour: 1 });

    const first = await request(app)
      .post('/api/visitor/requests')
      .set('Authorization', `Bearer ${fixture.guardToken}`)
      .send({ flatId: fixture.flat._id, gateId: fixture.gate._id, visitorName: 'Mobile Cap Visitor One', visitorMobile: '9000066666', visitorPhotoFileId: fixture.photo._id });
    expect(first.status).toBe(201);

    const second = await request(app)
      .post('/api/visitor/requests')
      .set('Authorization', `Bearer ${fixture.guardToken}`)
      .send({ flatId: fixture.flat._id, gateId: fixture.gate._id, visitorName: 'Mobile Cap Visitor Two', visitorMobile: '9000066666', visitorPhotoFileId: fixture.photo._id });
    expect(second.status).toBe(400);
  });
});
