import request from 'supertest';
import app from '../app';
import { connectTestDb, clearDb, seedRoles } from './helpers';
import { createMcrFixture, createMcrFlat } from './mcr.helpers';
import { MaintenanceDemand } from '../modules/mcr/demand.model';

beforeAll(async () => {
  await connectTestDb();
  await seedRoles();
});

afterEach(async () => {
  await clearDb();
  await seedRoles();
});

async function createBillingPlan(token: string) {
  const chargeHeadId = await request(app)
    .post('/api/mcr/charge-heads')
    .set('Authorization', `Bearer ${token}`)
    .send({ code: 'LTF', name: 'Late Fee Base Plan', category: 'MAINTENANCE', defaultAmountPaise: 500000, calculationMethod: 'FIXED_FLAT' })
    .then((res) => res.body.data._id as string);
  return request(app)
    .post('/api/mcr/billing-plans')
    .set('Authorization', `Bearer ${token}`)
    .send({
      name: 'Late Fee Plan',
      frequency: 'MONTHLY',
      billingDay: 1,
      dueDay: 10,
      effectiveFrom: '2026-01-01T00:00:00.000Z',
      chargeLines: [{ chargeHeadId, amountPaise: 500000, calculationMethod: 'FIXED_FLAT' }],
    })
    .then((res) => res.body.data._id as string);
}

describe('MCR late fee automation', () => {
  it('backfills missing late fee cycles for an overdue regular demand', async () => {
    const fixture = await createMcrFixture();
    const flat = await createMcrFlat(fixture, 'LF-101');
    const billingPlanId = await createBillingPlan(fixture.adminToken);
    await request(app)
      .patch('/api/mcr/settings')
      .set('Authorization', `Bearer ${fixture.adminToken}`)
      .send({ lateFeeEnabled: true, lateFeeAmountPaise: 100000, lateFeeIntervalDays: 30, gracePeriodDays: 7 });

    const demandId = await request(app)
      .post('/api/mcr/demands/drafts')
      .set('Authorization', `Bearer ${fixture.adminToken}`)
      .send({ billingPlanId, billingPeriodKey: '2026-04', billingPeriodLabel: 'April 2026', issueDate: '2026-04-01T00:00:00.000Z', flatIds: [flat._id.toString()] })
      .then((res) => res.body.data.items[0]._id as string);
    await request(app).post(`/api/mcr/demands/${demandId}/publish`).set('Authorization', `Bearer ${fixture.adminToken}`).send({});

    const runRes = await request(app)
      .post('/api/mcr/late-fees/run')
      .set('Authorization', `Bearer ${fixture.adminToken}`)
      .send({ asOfDate: '2026-07-25T00:00:00.000Z' });

    expect(runRes.status).toBe(200);
    expect(runRes.body.data.generatedCount).toBe(4);

    const lateFees = await MaintenanceDemand.find({
      societyId: fixture.society._id,
      parentDemandId: demandId,
      demandType: 'LATE_FEE',
    }).sort({ lateFeeCycleIndex: 1 });
    expect(lateFees).toHaveLength(4);
    expect(lateFees[0].lateFeeCycleIndex).toBe(1);
    expect(lateFees[3].lateFeeCycleIndex).toBe(4);
  });
});
