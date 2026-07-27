import request from 'supertest';
import app from '../app';
import { connectTestDb, clearDb, createUserWithRole, seedRoles } from './helpers';
import { createMcrFixture, createMcrFlat } from './mcr.helpers';
import { LedgerEntry } from '../modules/mcr/ledger.model';
import { MaintenanceDemand } from '../modules/mcr/demand.model';

beforeAll(async () => {
  await connectTestDb();
  await seedRoles();
});

afterEach(async () => {
  await clearDb();
  await seedRoles();
});

async function createPlanFixture() {
  const fixture = await createMcrFixture();
  const flatA = await createMcrFlat(fixture, 'A-101');
  const flatB = await createMcrFlat(fixture, 'A-102');
  const chargeHeadRes = await request(app)
    .post('/api/mcr/charge-heads')
    .set('Authorization', `Bearer ${fixture.adminToken}`)
    .send({
      code: 'MAINT',
      name: 'Monthly Maintenance',
      category: 'MAINTENANCE',
      defaultAmountPaise: 500000,
      calculationMethod: 'FIXED_FLAT',
    });
  const billingPlanRes = await request(app)
    .post('/api/mcr/billing-plans')
    .set('Authorization', `Bearer ${fixture.adminToken}`)
    .send({
      name: 'Monthly Society Plan',
      frequency: 'MONTHLY',
      billingDay: 1,
      dueDay: 10,
      effectiveFrom: '2026-07-01T00:00:00.000Z',
      chargeLines: [{
        chargeHeadId: chargeHeadRes.body.data._id,
        amountPaise: 500000,
        calculationMethod: 'FIXED_FLAT',
      }],
    });

  return { fixture, flatA, flatB, billingPlanId: billingPlanRes.body.data._id };
}

describe('MCR demand draft and publish flow', () => {
  it('generates idempotent drafts for society flats', async () => {
    const { fixture, billingPlanId } = await createPlanFixture();
    const first = await request(app)
      .post('/api/mcr/demands/drafts')
      .set('Authorization', `Bearer ${fixture.adminToken}`)
      .send({ billingPlanId, billingPeriodKey: '2026-07', billingPeriodLabel: 'July 2026' });

    expect(first.status).toBe(201);
    expect(first.body.data.createdCount).toBe(2);
    expect(first.body.data.items[0].status).toBe('DRAFT');
    expect(first.body.data.items[0].totalDemandPaise).toBe(500000);

    const second = await request(app)
      .post('/api/mcr/demands/drafts')
      .set('Authorization', `Bearer ${fixture.adminToken}`)
      .send({ billingPlanId, billingPeriodKey: '2026-07', billingPeriodLabel: 'July 2026' });

    expect(second.status).toBe(201);
    expect(second.body.data.createdCount).toBe(0);
    expect(second.body.data.existingCount).toBe(2);
  });

  it('publishes a draft with a demand number and immutable ledger posting', async () => {
    const { fixture, billingPlanId } = await createPlanFixture();
    const draftRes = await request(app)
      .post('/api/mcr/demands/drafts')
      .set('Authorization', `Bearer ${fixture.adminToken}`)
      .send({ billingPlanId, billingPeriodKey: '2026-08', billingPeriodLabel: 'August 2026', flatIds: [] });
    const demandId = draftRes.body.data.items[0]._id;

    const publishRes = await request(app)
      .post(`/api/mcr/demands/${demandId}/publish`)
      .set('Authorization', `Bearer ${fixture.adminToken}`)
      .send({});

    expect(publishRes.status).toBe(200);
    expect(publishRes.body.data.status).toBe('PUBLISHED');
    expect(publishRes.body.data.demandNumber).toContain('MCRD/2026-08/');

    const ledgerEntry = await LedgerEntry.findOne({
      societyId: fixture.society._id,
      sourceType: 'MaintenanceDemand',
      sourceId: demandId,
    });
    expect(ledgerEntry).not.toBeNull();
    expect(ledgerEntry!.debitPaise).toBe(500000);
    expect(ledgerEntry!.creditPaise).toBe(0);

    const publishAgain = await request(app)
      .post(`/api/mcr/demands/${demandId}/publish`)
      .set('Authorization', `Bearer ${fixture.adminToken}`)
      .send({});

    expect(publishAgain.status).toBe(409);
  });

  it('does not allow another society to publish a foreign draft', async () => {
    const { fixture, billingPlanId } = await createPlanFixture();
    const draftRes = await request(app)
      .post('/api/mcr/demands/drafts')
      .set('Authorization', `Bearer ${fixture.adminToken}`)
      .send({ billingPlanId, billingPeriodKey: '2026-09', billingPeriodLabel: 'September 2026' });
    const outsider = await createMcrFixture();

    const res = await request(app)
      .post(`/api/mcr/demands/${draftRes.body.data.items[0]._id}/publish`)
      .set('Authorization', `Bearer ${outsider.adminToken}`)
      .send({});

    expect(res.status).toBe(404);
  });

  it('applies existing advance credit to a future demand and restores it on bounce', async () => {
    const { fixture, billingPlanId } = await createPlanFixture();
    const { token: verifierToken } = await createUserWithRole({
      roleCode: 'SOCIETY_ADMIN',
      societyId: fixture.society._id.toString(),
      email: `publish-advance-${Date.now()}@test.com`,
    });
    const firstFlatId = fixture.admin.flatId || (await createMcrFlat(fixture, 'A-103'))._id.toString();
    const firstDemandId = await request(app)
      .post('/api/mcr/demands/drafts')
      .set('Authorization', `Bearer ${fixture.adminToken}`)
      .send({ billingPlanId, billingPeriodKey: '2026-10', billingPeriodLabel: 'October 2026', flatIds: [firstFlatId] })
      .then((res) => res.body.data.items[0]._id as string);
    await request(app).post(`/api/mcr/demands/${firstDemandId}/publish`).set('Authorization', `Bearer ${fixture.adminToken}`).send({});

    const paymentId = await request(app)
      .post('/api/mcr/payments')
      .set('Authorization', `Bearer ${fixture.adminToken}`)
      .send({ flatId: firstFlatId, payerName: 'Advance Holder', amountPaise: 700000, paymentMethod: 'UPI', upiReference: 'ADV-HOLDER-1' })
      .then((res) => res.body.data._id as string);
    await request(app).post(`/api/mcr/payments/${paymentId}/verify`).set('Authorization', `Bearer ${verifierToken}`).send({});

    const futureDraftId = await request(app)
      .post('/api/mcr/demands/drafts')
      .set('Authorization', `Bearer ${fixture.adminToken}`)
      .send({ billingPlanId, billingPeriodKey: '2026-11', billingPeriodLabel: 'November 2026', flatIds: [firstFlatId] })
      .then((res) => res.body.data.items[0]._id as string);
    const publishRes = await request(app)
      .post(`/api/mcr/demands/${futureDraftId}/publish`)
      .set('Authorization', `Bearer ${fixture.adminToken}`)
      .send({});

    expect(publishRes.status).toBe(200);
    expect(publishRes.body.data.advanceAppliedPaise).toBe(200000);
    expect(publishRes.body.data.outstandingPaise).toBe(300000);
    expect(publishRes.body.data.status).toBe('PARTIALLY_PAID');

    const futureLedger = await LedgerEntry.findOne({
      societyId: fixture.society._id,
      sourceType: 'MaintenanceDemand',
      sourceId: futureDraftId,
    });
    expect(futureLedger!.runningBalancePaise).toBe(300000);

    await request(app)
      .post(`/api/mcr/payments/${paymentId}/bounce`)
      .set('Authorization', `Bearer ${fixture.adminToken}`)
      .send({ reason: 'Cheque reversed' });

    const refreshedFutureDemand = await MaintenanceDemand.findById(futureDraftId).orFail();
    expect(refreshedFutureDemand.advanceAppliedPaise).toBe(0);
    expect(refreshedFutureDemand.paidPaise).toBe(0);
    expect(refreshedFutureDemand.outstandingPaise).toBe(500000);
    expect(refreshedFutureDemand.status).toBe('PUBLISHED');
  });
});
