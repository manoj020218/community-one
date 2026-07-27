import request from 'supertest';
import app from '../app';
import { MaintenanceDemand } from '../modules/mcr/demand.model';
import { clearDb, connectTestDb, seedRoles } from './helpers';
import { createMcrFixture, createMcrFlat } from './mcr.helpers';

beforeAll(async () => {
  await connectTestDb();
  await seedRoles();
});

afterEach(async () => {
  await clearDb();
  await seedRoles();
});

async function createAutoPlan() {
  const fixture = await createMcrFixture();
  const flat = await createMcrFlat(fixture, 'B-101');
  const chargeHeadId = await request(app)
    .post('/api/mcr/charge-heads')
    .set('Authorization', `Bearer ${fixture.adminToken}`)
    .send({ code: 'AUTO', name: 'Automation Charge', category: 'MAINTENANCE', defaultAmountPaise: 350000, calculationMethod: 'FIXED_FLAT' })
    .then((res) => res.body.data._id as string);
  const billingPlanId = await request(app)
    .post('/api/mcr/billing-plans')
    .set('Authorization', `Bearer ${fixture.adminToken}`)
    .send({
      name: `Automation Plan ${Date.now()}`,
      frequency: 'MONTHLY',
      billingDay: 5,
      dueDay: 12,
      effectiveFrom: '2026-07-01T00:00:00.000Z',
      autoGenerate: true,
      autoPublish: true,
      chargeLines: [{ chargeHeadId, amountPaise: 350000, calculationMethod: 'FIXED_FLAT' }],
    })
    .then((res) => res.body.data._id as string);

  return { fixture, flat, billingPlanId };
}

describe('MCR demand automation', () => {
  it('backfills due monthly cycles and publishes them once', async () => {
    const { fixture } = await createAutoPlan();
    const run = await request(app)
      .post('/api/mcr/demands/automation/run')
      .set('Authorization', `Bearer ${fixture.adminToken}`)
      .send({ asOf: '2026-09-20T00:00:00.000Z', limit: 12 });

    expect(run.status).toBe(200);
    expect(run.body.data.processedPlanCount).toBe(1);
    expect(run.body.data.generatedDemandCount).toBe(3);
    expect(run.body.data.publishedDemandCount).toBe(3);

    const demands = await MaintenanceDemand.find({ societyId: fixture.society._id }).sort({ issueDate: 1 });
    expect(demands.map((item) => item.billingPeriodKey)).toEqual(['2026-07', '2026-08', '2026-09']);
    expect(demands.every((item) => item.status === 'PUBLISHED')).toBe(true);
    expect(demands[0].issueDate.toISOString().slice(0, 10)).toBe('2026-07-05');
    expect(demands[0].dueDate.toISOString().slice(0, 10)).toBe('2026-07-12');

    const rerun = await request(app)
      .post('/api/mcr/demands/automation/run')
      .set('Authorization', `Bearer ${fixture.adminToken}`)
      .send({ asOf: '2026-09-20T00:00:00.000Z', limit: 12 });

    expect(rerun.status).toBe(200);
    expect(rerun.body.data.generatedDemandCount).toBe(0);
    expect(rerun.body.data.publishedDemandCount).toBe(0);
  });

  it('uses billing-plan dueDay even when due date falls in the next month', async () => {
    const { fixture, flat } = await createAutoPlan();
    const chargeHeadId = await request(app)
      .post('/api/mcr/charge-heads')
      .set('Authorization', `Bearer ${fixture.adminToken}`)
      .send({ code: 'NEXTDUE', name: 'Next Due Charge', category: 'MAINTENANCE', defaultAmountPaise: 200000, calculationMethod: 'FIXED_FLAT' })
      .then((res) => res.body.data._id as string);
    const billingPlanId = await request(app)
      .post('/api/mcr/billing-plans')
      .set('Authorization', `Bearer ${fixture.adminToken}`)
      .send({
        name: `Cross Month Due ${Date.now()}`,
        frequency: 'MONTHLY',
        billingDay: 25,
        dueDay: 5,
        effectiveFrom: '2026-07-01T00:00:00.000Z',
        chargeLines: [{ chargeHeadId, amountPaise: 200000, calculationMethod: 'FIXED_FLAT' }],
      })
      .then((res) => res.body.data._id as string);

    const draft = await request(app)
      .post('/api/mcr/demands/drafts')
      .set('Authorization', `Bearer ${fixture.adminToken}`)
      .send({
        billingPlanId,
        billingPeriodKey: '2026-07',
        billingPeriodLabel: 'July 2026',
        issueDate: '2026-07-25T00:00:00.000Z',
        flatIds: [flat._id.toString()],
      });

    expect(draft.status).toBe(201);
    expect(draft.body.data.items[0].dueDate.slice(0, 10)).toBe('2026-08-05');
  });
});
