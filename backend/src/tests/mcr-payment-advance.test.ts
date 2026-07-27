import request from 'supertest';
import app from '../app';
import { connectTestDb, clearDb, createUserWithRole, seedRoles } from './helpers';
import { createMcrFixture, createMcrFlat } from './mcr.helpers';
import { LedgerEntry } from '../modules/mcr/ledger.model';

beforeAll(async () => {
  await connectTestDb();
  await seedRoles();
});

afterEach(async () => {
  await clearDb();
  await seedRoles();
});

async function createBillingPlan(fixture: Awaited<ReturnType<typeof createMcrFixture>>) {
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
  return billingPlanRes.body.data._id as string;
}

async function publishDemand(token: string, billingPlanId: string, flatId: string, billingPeriodKey: string) {
  const draftRes = await request(app)
    .post('/api/mcr/demands/drafts')
    .set('Authorization', `Bearer ${token}`)
    .send({ billingPlanId, billingPeriodKey, billingPeriodLabel: billingPeriodKey, flatIds: [flatId] });
  const demandId = draftRes.body.data.items[0]._id;
  await request(app).post(`/api/mcr/demands/${demandId}/publish`).set('Authorization', `Bearer ${token}`).send({});
  return demandId as string;
}

describe('MCR advance payment lifecycle', () => {
  it('creates advance credit when a verified payment exceeds outstanding dues', async () => {
    const fixture = await createMcrFixture();
    const { token: verifierToken } = await createUserWithRole({
      roleCode: 'SOCIETY_ADMIN',
      societyId: fixture.society._id.toString(),
      email: `advance-${Date.now()}@test.com`,
    });
    const flat = await createMcrFlat(fixture, 'C-101');
    const billingPlanId = await createBillingPlan(fixture);
    await publishDemand(fixture.adminToken, billingPlanId, flat._id.toString(), '2026-10');

    const paymentRes = await request(app)
      .post('/api/mcr/payments')
      .set('Authorization', `Bearer ${fixture.adminToken}`)
      .send({
        flatId: flat._id.toString(),
        payerName: 'Resident C-101',
        amountPaise: 700000,
        paymentMethod: 'UPI',
        upiReference: 'ADV-UPI-700000',
      });

    const verifyRes = await request(app)
      .post(`/api/mcr/payments/${paymentRes.body.data._id}/verify`)
      .set('Authorization', `Bearer ${verifierToken}`)
      .send({});

    expect(verifyRes.status).toBe(200);
    expect(verifyRes.body.data.payment.allocatedAmountPaise).toBe(500000);
    expect(verifyRes.body.data.payment.advanceCreatedPaise).toBe(200000);
    expect(verifyRes.body.data.receipt.advanceAmountPaise).toBe(200000);
    expect(verifyRes.body.data.allocations).toHaveLength(1);

    const paymentGetRes = await request(app)
      .get(`/api/mcr/payments/${paymentRes.body.data._id}`)
      .set('Authorization', `Bearer ${fixture.adminToken}`);
    expect(paymentGetRes.status).toBe(200);
    expect(paymentGetRes.body.data.advanceCreatedPaise).toBe(200000);

    const receiptByPaymentRes = await request(app)
      .get(`/api/mcr/payments/${paymentRes.body.data._id}/receipt`)
      .set('Authorization', `Bearer ${fixture.adminToken}`);
    expect(receiptByPaymentRes.status).toBe(200);
    expect(receiptByPaymentRes.body.data.advanceAmountPaise).toBe(200000);

    const ledgerEntry = await LedgerEntry.findOne({
      societyId: fixture.society._id,
      sourceType: 'PAYMENT',
      sourceId: paymentRes.body.data._id,
    });
    expect(ledgerEntry!.runningBalancePaise).toBe(-200000);
  });

  it('allows a fully advance payment when there are no outstanding published demands', async () => {
    const fixture = await createMcrFixture();
    const { token: verifierToken } = await createUserWithRole({
      roleCode: 'SOCIETY_ADMIN',
      societyId: fixture.society._id.toString(),
      email: `fulladvance-${Date.now()}@test.com`,
    });
    const flat = await createMcrFlat(fixture, 'C-102');

    const paymentRes = await request(app)
      .post('/api/mcr/payments')
      .set('Authorization', `Bearer ${fixture.adminToken}`)
      .send({
        flatId: flat._id.toString(),
        payerName: 'Resident C-102',
        amountPaise: 300000,
        paymentMethod: 'CASH',
        cashCollectionReference: 'ADV-CASH-1',
      });

    const verifyRes = await request(app)
      .post(`/api/mcr/payments/${paymentRes.body.data._id}/verify`)
      .set('Authorization', `Bearer ${verifierToken}`)
      .send({});

    expect(verifyRes.status).toBe(200);
    expect(verifyRes.body.data.allocations).toHaveLength(0);
    expect(verifyRes.body.data.payment.allocatedAmountPaise).toBe(0);
    expect(verifyRes.body.data.payment.advanceCreatedPaise).toBe(300000);
    expect(verifyRes.body.data.receipt.advanceAmountPaise).toBe(300000);
  });

  it('rejects overpayment verification when advance payments are disabled', async () => {
    const fixture = await createMcrFixture();
    const { token: verifierToken } = await createUserWithRole({
      roleCode: 'SOCIETY_ADMIN',
      societyId: fixture.society._id.toString(),
      email: `noadvance-${Date.now()}@test.com`,
    });
    const flat = await createMcrFlat(fixture, 'C-103');
    const billingPlanId = await createBillingPlan(fixture);
    await publishDemand(fixture.adminToken, billingPlanId, flat._id.toString(), '2026-11');
    await request(app)
      .patch('/api/mcr/settings')
      .set('Authorization', `Bearer ${fixture.adminToken}`)
      .send({ allowAdvancePayment: false });

    const paymentRes = await request(app)
      .post('/api/mcr/payments')
      .set('Authorization', `Bearer ${fixture.adminToken}`)
      .send({
        flatId: flat._id.toString(),
        payerName: 'Resident C-103',
        amountPaise: 600000,
        paymentMethod: 'BANK_TRANSFER',
        bankReference: 'ADV-BANK-1',
      });

    const verifyRes = await request(app)
      .post(`/api/mcr/payments/${paymentRes.body.data._id}/verify`)
      .set('Authorization', `Bearer ${verifierToken}`)
      .send({});

    expect(verifyRes.status).toBe(400);
    expect(verifyRes.body.error.message).toBe('Advance payments are disabled in MCR settings');
  });
});
