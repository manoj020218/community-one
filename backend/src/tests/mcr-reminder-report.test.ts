import request from 'supertest';
import app from '../app';
import { connectTestDb, clearDb, createUserWithRole, seedRoles } from './helpers';
import { createMcrFixture, createMcrFlat } from './mcr.helpers';
import { Notification } from '../modules/notification/notification.model';
import { Resident } from '../modules/resident/resident.model';
import { McrNotificationDispatch } from '../modules/mcr/mcrNotificationDispatch.model';

beforeAll(async () => {
  await connectTestDb();
  await seedRoles();
});

afterEach(async () => {
  await clearDb();
  await seedRoles();
});

async function createPastDueDemand(fixture: Awaited<ReturnType<typeof createMcrFixture>>, flatId: string) {
  const chargeHeadId = await request(app)
    .post('/api/mcr/charge-heads')
    .set('Authorization', `Bearer ${fixture.adminToken}`)
    .send({ code: 'REM', name: 'Reminder Maintenance', category: 'MAINTENANCE', defaultAmountPaise: 500000, calculationMethod: 'FIXED_FLAT' })
    .then((res) => res.body.data._id as string);
  const billingPlanId = await request(app)
    .post('/api/mcr/billing-plans')
    .set('Authorization', `Bearer ${fixture.adminToken}`)
    .send({
      name: 'Reminder Plan',
      frequency: 'MONTHLY',
      billingDay: 1,
      dueDay: 10,
      effectiveFrom: '2026-01-01T00:00:00.000Z',
      chargeLines: [{ chargeHeadId, amountPaise: 500000, calculationMethod: 'FIXED_FLAT' }],
    })
    .then((res) => res.body.data._id as string);
  const demandId = await request(app)
    .post('/api/mcr/demands/drafts')
    .set('Authorization', `Bearer ${fixture.adminToken}`)
    .send({ billingPlanId, billingPeriodKey: '2026-06', billingPeriodLabel: 'June 2026', issueDate: '2026-06-01T00:00:00.000Z', flatIds: [flatId] })
    .then((res) => res.body.data.items[0]._id as string);
  await request(app).post(`/api/mcr/demands/${demandId}/publish`).set('Authorization', `Bearer ${fixture.adminToken}`).send({});
  return demandId;
}

describe('MCR reminder and report endpoints', () => {
  it('sends a due reminder once per day and exposes overdue summary/statement data', async () => {
    const fixture = await createMcrFixture();
    const flat = await createMcrFlat(fixture, 'D-101');
    const { user: owner } = await createUserWithRole({
      roleCode: 'OWNER',
      societyId: fixture.society._id.toString(),
      flatId: flat._id.toString(),
      email: `owner-${Date.now()}@test.com`,
    });
    await Resident.findOneAndUpdate({ societyId: fixture.society._id, flatId: flat._id, primaryContact: true }, { userId: owner._id });
    const demandId = await createPastDueDemand(fixture, flat._id.toString());

    const reminderRes = await request(app)
      .post(`/api/mcr/demands/${demandId}/reminders`)
      .set('Authorization', `Bearer ${fixture.adminToken}`)
      .send({});
    expect(reminderRes.status).toBe(200);
    expect(reminderRes.body.data.sentCount).toBe(1);

    const duplicateRes = await request(app)
      .post(`/api/mcr/demands/${demandId}/reminders`)
      .set('Authorization', `Bearer ${fixture.adminToken}`)
      .send({});
    expect(duplicateRes.status).toBe(200);
    expect(duplicateRes.body.data.duplicateCount).toBe(1);

    const notification = await Notification.findOne({ userId: owner._id, entityId: demandId }).orFail();
    expect(notification.moduleCode).toBe('MCR');
    const dispatch = await McrNotificationDispatch.findOne({ entityId: demandId, channel: 'IN_APP', status: 'SENT' }).orFail();
    expect(dispatch.status).toBe('SENT');

    const summaryRes = await request(app)
      .get(`/api/mcr/reports/summary?flatId=${flat._id}`)
      .set('Authorization', `Bearer ${fixture.adminToken}`);
    expect(summaryRes.status).toBe(200);
    expect(summaryRes.body.data.outstandingPaise).toBe(500000);
    expect(summaryRes.body.data.overduePaise).toBe(500000);

    const statementRes = await request(app)
      .get(`/api/mcr/reports/statement?flatId=${flat._id}`)
      .set('Authorization', `Bearer ${fixture.adminToken}`);
    expect(statementRes.status).toBe(200);
    expect(statementRes.body.data.demands).toHaveLength(1);
    expect(statementRes.body.data.payments).toHaveLength(0);
    expect(statementRes.body.data.summary.outstandingPaise).toBe(500000);
  });
});
