import request from 'supertest';
import app from '../app';
import { Notification } from '../modules/notification/notification.model';
import { clearDb, connectTestDb, seedRoles } from './helpers';
import { createSamaFixture } from './sama.helpers';

beforeAll(async () => {
  await connectTestDb();
  await seedRoles();
});

afterEach(async () => {
  await clearDb();
  await seedRoles();
});

describe('SAMA advanced staff and work-order lifecycle', () => {
  it('handles staff lifecycle depth plus work-order reschedule, escalation, cancel, and reporting', async () => {
    const fixture = await createSamaFixture();

    const categoryRes = await request(app).post('/api/sama/staff-categories').set('Authorization', `Bearer ${fixture.adminToken}`).send({
      code: 'TECH',
      name: 'Technician',
      staffTypes: ['SOCIETY_EMPLOYEE'],
      requiresSocietyApproval: true,
    });

    const staffRes = await request(app).post('/api/sama/staff-profiles').set('Authorization', `Bearer ${fixture.adminToken}`).send({
      firstName: 'Anil',
      displayName: 'Anil Tech',
      mobile: '9000000041',
      staffType: 'SOCIETY_EMPLOYEE',
      primaryCategory: 'TECH',
    });
    const staffId = staffRes.body.data._id;

    const approveRes = await request(app).post(`/api/sama/staff-profiles/${staffId}/approve`).set('Authorization', `Bearer ${fixture.adminToken}`).send({});
    const suspendRes = await request(app).post(`/api/sama/staff-profiles/${staffId}/suspend`).set('Authorization', `Bearer ${fixture.adminToken}`).send({ reason: 'Missing ID verification' });
    const reinstateRes = await request(app).post(`/api/sama/staff-profiles/${staffId}/reinstate`).set('Authorization', `Bearer ${fixture.adminToken}`).send({});
    const terminateRes = await request(app).post(`/api/sama/staff-profiles/${staffId}/terminate`).set('Authorization', `Bearer ${fixture.adminToken}`).send({ reason: 'Contract ended' });

    const providerRes = await request(app).post('/api/sama/service-providers').set('Authorization', `Bearer ${fixture.adminToken}`).send({
      displayName: 'Metro Repairs',
      providerType: 'COMPANY',
      contactPersonName: 'Rakesh',
      mobile: '9000000042',
      serviceCategories: ['ELECTRICAL'],
    });

    const workOrderRes = await request(app).post('/api/sama/work-orders').set('Authorization', `Bearer ${fixture.adminToken}`).send({
      title: 'Lift panel repair',
      category: 'ELECTRICAL',
      priority: 'HIGH',
      scheduledStartAt: '2026-07-27T10:00:00.000Z',
      scheduledEndAt: '2026-07-27T11:00:00.000Z',
      slaTargetMinutes: 60,
    });
    const workOrderId = workOrderRes.body.data._id;

    const assignRes = await request(app).patch(`/api/sama/work-orders/${workOrderId}/assign`).set('Authorization', `Bearer ${fixture.adminToken}`).send({
      assignedServiceProviderId: providerRes.body.data._id,
      scheduledStartAt: '2026-07-27T10:00:00.000Z',
      scheduledEndAt: '2026-07-27T11:00:00.000Z',
      slaTargetMinutes: 60,
    });
    const rescheduleRes = await request(app).patch(`/api/sama/work-orders/${workOrderId}/reschedule`).set('Authorization', `Bearer ${fixture.adminToken}`).send({
      scheduledStartAt: '2026-07-27T12:00:00.000Z',
      scheduledEndAt: '2026-07-27T13:30:00.000Z',
      slaTargetMinutes: 90,
      rescheduleReason: 'Technician arrival delayed',
    });
    const escalateRes = await request(app).patch(`/api/sama/work-orders/${workOrderId}/escalate`).set('Authorization', `Bearer ${fixture.adminToken}`).send({
      escalationReason: 'Repair impacting common operations',
      priority: 'URGENT',
    });
    const cancelRes = await request(app).patch(`/api/sama/work-orders/${workOrderId}/cancel`).set('Authorization', `Bearer ${fixture.adminToken}`).send({
      cancellationReason: 'Vendor issue fixed under AMC',
    });

    const staffReportRes = await request(app).get('/api/sama/reports/staff').set('Authorization', `Bearer ${fixture.adminToken}`);
    const workOrderReportRes = await request(app).get('/api/sama/reports/work-orders').query({ escalatedOnly: true }).set('Authorization', `Bearer ${fixture.adminToken}`);
    const exportRes = await request(app).get('/api/sama/reports/export').query({ reportType: 'WORK_ORDERS' }).set('Authorization', `Bearer ${fixture.adminToken}`);

    const notifications = await Notification.find({ userId: fixture.admin._id }).sort({ createdAt: 1 }).lean();

    expect(categoryRes.status).toBe(201);
    expect(staffRes.body.data.lifecycleStatus).toBe('SUSPENDED');
    expect(staffRes.body.data.accessStatus).toBe('SUSPENDED');
    expect(staffRes.body.data.verificationStatus).toBe('PENDING');
    expect(approveRes.body.data.lifecycleStatus).toBe('ACTIVE');
    expect(approveRes.body.data.verificationStatus).toBe('APPROVED');
    expect(suspendRes.body.data.suspensionReason).toBe('Missing ID verification');
    expect(reinstateRes.body.data.lifecycleStatus).toBe('ACTIVE');
    expect(terminateRes.body.data.lifecycleStatus).toBe('TERMINATED');
    expect(terminateRes.body.data.accessStatus).toBe('BLOCKED');
    expect(assignRes.body.data.status).toBe('ASSIGNED');
    expect(rescheduleRes.body.data.rescheduleReason).toBe('Technician arrival delayed');
    expect(escalateRes.body.data.escalationLevel).toBe(1);
    expect(escalateRes.body.data.priority).toBe('URGENT');
    expect(cancelRes.body.data.status).toBe('CANCELLED');
    expect(staffReportRes.body.data.lifecycleBreakdown).toContainEqual({ status: 'TERMINATED', count: 1 });
    expect(workOrderReportRes.body.data.totalCount).toBe(1);
    expect(workOrderReportRes.body.data.escalatedCount).toBe(1);
    expect(workOrderReportRes.body.data.cancelledCount).toBe(1);
    expect(exportRes.body.data.content).toContain('workOrderCode');
    expect(exportRes.body.data.content).toContain('Lift panel repair');
    expect(notifications.map((item) => item.title)).toEqual([
      'Work order assigned',
      'Work order rescheduled',
      'Work order escalated',
      'Work order cancelled',
    ]);
  });
});
