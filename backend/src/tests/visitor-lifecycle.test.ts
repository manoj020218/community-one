import request from 'supertest';
import app from '../app';
import { AuditLog } from '../modules/audit/audit.model';
import { VisitorRequest } from '../modules/visitor/visitor.model';
import { clearDb, connectTestDb, seedRoles } from './helpers';
import { createVisitorFixture } from './visitor.helpers';

beforeAll(async () => {
  await connectTestDb();
  await seedRoles();
});

afterEach(async () => {
  await clearDb();
  await seedRoles();
});

describe('Visitor Lifecycle', () => {
  it('should create, approve, and complete a visitor request', async () => {
    const fixture = await createVisitorFixture();

    const contextRes = await request(app)
      .get('/api/visitor/context')
      .set('Authorization', `Bearer ${fixture.guardToken}`);
    expect(contextRes.status).toBe(200);
    expect(contextRes.body.data.activeContext.gateIds).toContain(fixture.gate._id.toString());

    const createRes = await request(app)
      .post('/api/visitor/requests')
      .set('Authorization', `Bearer ${fixture.guardToken}`)
      .send({
        flatId: fixture.flat._id,
        gateId: fixture.gate._id,
        visitorName: 'Rahul Visitor',
        visitorMobile: '9876543210',
        purpose: 'Meeting',
        visitorPhotoFileId: fixture.photo._id,
      });
    expect(createRes.status).toBe(201);
    expect(createRes.body.data.status).toBe('PENDING_APPROVAL');

    const notificationsRes = await request(app)
      .get('/api/notifications')
      .set('Authorization', `Bearer ${fixture.residentToken}`);
    expect(notificationsRes.status).toBe(200);
    expect(notificationsRes.body.data.items[0].deliveryStatus).toBe('PENDING_PROVIDER_CONFIGURATION');

    const requestId = createRes.body.data._id;
    const approveRes = await request(app)
      .post(`/api/visitor/requests/${requestId}/approve`)
      .set('Authorization', `Bearer ${fixture.residentToken}`)
      .send({});
    expect(approveRes.status).toBe(200);
    expect(approveRes.body.data.status).toBe('APPROVED');

    const entryRes = await request(app)
      .post(`/api/visitor/requests/${requestId}/confirm-entry`)
      .set('Authorization', `Bearer ${fixture.guardToken}`)
      .send({});
    expect(entryRes.status).toBe(200);
    expect(entryRes.body.data.status).toBe('ENTRY_CONFIRMED');

    const exitRes = await request(app)
      .post(`/api/visitor/requests/${requestId}/confirm-exit`)
      .set('Authorization', `Bearer ${fixture.guardToken}`)
      .send({});
    expect(exitRes.status).toBe(200);
    expect(exitRes.body.data.status).toBe('EXIT_CONFIRMED');
  });

  it('should treat repeated client request IDs as idempotent', async () => {
    const fixture = await createVisitorFixture();
    const payload = {
      flatId: fixture.flat._id,
      gateId: fixture.gate._id,
      visitorName: 'Repeat Visitor',
      visitorMobile: '9123456789',
      visitorPhotoFileId: fixture.photo._id,
      clientRequestId: 'req-123',
    };

    const first = await request(app).post('/api/visitor/requests').set('Authorization', `Bearer ${fixture.guardToken}`).send(payload);
    const second = await request(app).post('/api/visitor/requests').set('Authorization', `Bearer ${fixture.guardToken}`).send(payload);
    expect(first.status).toBe(201);
    expect(second.status).toBe(201);
    expect(second.body.data._id).toBe(first.body.data._id);
    expect(await VisitorRequest.countDocuments({ societyId: fixture.society._id })).toBe(1);
  });

  it('should reject a visitor request with a reason', async () => {
    const fixture = await createVisitorFixture();
    const createRes = await request(app)
      .post('/api/visitor/requests')
      .set('Authorization', `Bearer ${fixture.guardToken}`)
      .send({ flatId: fixture.flat._id, gateId: fixture.gate._id, visitorName: 'Rejected Visitor', visitorMobile: '9111122223', visitorPhotoFileId: fixture.photo._id });

    const rejectRes = await request(app)
      .post(`/api/visitor/requests/${createRes.body.data._id}/reject`)
      .set('Authorization', `Bearer ${fixture.residentToken}`)
      .send({ rejectionReason: 'Not expected' });
    expect(rejectRes.status).toBe(200);
    expect(rejectRes.body.data.status).toBe('REJECTED');

    const requestDoc = await VisitorRequest.findById(createRes.body.data._id);
    expect(requestDoc?.rejectionReason).toBe('Not expected');
  });

  it('should reject an invalid status transition (confirm-entry on a rejected request)', async () => {
    const fixture = await createVisitorFixture();
    const createRes = await request(app)
      .post('/api/visitor/requests')
      .set('Authorization', `Bearer ${fixture.guardToken}`)
      .send({ flatId: fixture.flat._id, gateId: fixture.gate._id, visitorName: 'Invalid Transition Visitor', visitorMobile: '9111122224', visitorPhotoFileId: fixture.photo._id });
    const requestId = createRes.body.data._id;

    await request(app).post(`/api/visitor/requests/${requestId}/reject`).set('Authorization', `Bearer ${fixture.residentToken}`).send({});

    const entryRes = await request(app)
      .post(`/api/visitor/requests/${requestId}/confirm-entry`)
      .set('Authorization', `Bearer ${fixture.guardToken}`)
      .send({});
    expect(entryRes.status).toBe(409);

    const requestDoc = await VisitorRequest.findById(requestId);
    expect(requestDoc?.status).toBe('REJECTED');
  });

  it('should write audit entries for creation, notification, and approval', async () => {
    const fixture = await createVisitorFixture();
    const createRes = await request(app)
      .post('/api/visitor/requests')
      .set('Authorization', `Bearer ${fixture.guardToken}`)
      .send({ flatId: fixture.flat._id, gateId: fixture.gate._id, visitorName: 'Audited Visitor', visitorMobile: '9111122225', visitorPhotoFileId: fixture.photo._id });
    const requestId = createRes.body.data._id;

    await request(app).post(`/api/visitor/requests/${requestId}/approve`).set('Authorization', `Bearer ${fixture.residentToken}`).send({});
    await request(app).get(`/api/visitor/requests/${requestId}`).set('Authorization', `Bearer ${fixture.residentToken}`);

    const actions = (await AuditLog.find({ entityId: requestId }).select('action')).map((log) => log.action);
    expect(actions).toEqual(expect.arrayContaining([
      'VISITOR_REQUEST_CREATED',
      'VISITOR_NOTIFICATION_REQUESTED',
      'VISITOR_REQUEST_APPROVED',
      'VISITOR_REQUEST_VIEWED',
    ]));
  });
});
