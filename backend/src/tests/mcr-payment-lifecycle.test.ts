import request from 'supertest';
import app from '../app';
import { connectTestDb, clearDb, createUserWithRole, seedRoles } from './helpers';
import { createMcrFixture, createMcrFlat } from './mcr.helpers';
import { LedgerEntry } from '../modules/mcr/ledger.model';
import { MaintenanceDemand } from '../modules/mcr/demand.model';
import { McrPaymentAllocation } from '../modules/mcr/mcrPaymentAllocation.model';
import { McrReceipt } from '../modules/mcr/mcrReceipt.model';

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

async function createVerifiedPaymentFixture() {
  const fixture = await createMcrFixture();
  const { token: verifierToken } = await createUserWithRole({
    roleCode: 'SOCIETY_ADMIN',
    societyId: fixture.society._id.toString(),
    email: `phase3-${Date.now()}@test.com`,
  });
  const flat = await createMcrFlat(fixture, 'B-201');
  const billingPlanId = await createBillingPlan(fixture);
  const draftRes = await request(app)
    .post('/api/mcr/demands/drafts')
    .set('Authorization', `Bearer ${fixture.adminToken}`)
    .send({ billingPlanId, billingPeriodKey: '2026-09', billingPeriodLabel: 'September 2026', flatIds: [flat._id.toString()] });
  const demandId = draftRes.body.data.items[0]._id as string;
  await request(app)
    .post(`/api/mcr/demands/${demandId}/publish`)
    .set('Authorization', `Bearer ${fixture.adminToken}`)
    .send({});
  const createRes = await request(app)
    .post('/api/mcr/payments')
    .set('Authorization', `Bearer ${fixture.adminToken}`)
    .send({
      flatId: flat._id.toString(),
      payerName: 'Resident B-201',
      amountPaise: 500000,
      paymentMethod: 'CHEQUE',
      chequeNumber: 'CHQ-201',
      chequeDate: '2026-07-25T00:00:00.000Z',
      bankName: 'Jenix Bank',
    });
  const verifyRes = await request(app)
    .post(`/api/mcr/payments/${createRes.body.data._id}/verify`)
    .set('Authorization', `Bearer ${verifierToken}`)
    .send({});

  return {
    fixture,
    verifierToken,
    flatId: flat._id.toString(),
    demandId,
    paymentId: createRes.body.data._id as string,
    receiptId: verifyRes.body.data.receipt._id as string,
    receiptNumber: verifyRes.body.data.receipt.receiptNumber as string,
  };
}

describe('MCR payment lifecycle and receipt retrieval', () => {
  it('cancels a pending payment without financial postings', async () => {
    const fixture = await createMcrFixture();
    const flat = await createMcrFlat(fixture, 'B-101');
    const createRes = await request(app)
      .post('/api/mcr/payments')
      .set('Authorization', `Bearer ${fixture.adminToken}`)
      .send({
        flatId: flat._id.toString(),
        payerName: 'Resident B-101',
        amountPaise: 220000,
        paymentMethod: 'CASH',
        cashCollectionReference: 'COUNTER-22',
      });

    const cancelRes = await request(app)
      .post(`/api/mcr/payments/${createRes.body.data._id}/cancel`)
      .set('Authorization', `Bearer ${fixture.adminToken}`)
      .send({ reason: 'Duplicate cash entry' });

    expect(cancelRes.status).toBe(200);
    expect(cancelRes.body.data.status).toBe('CANCELLED');
    expect(cancelRes.body.data.cancellationReason).toBe('Duplicate cash entry');

    const ledgerEntry = await LedgerEntry.findOne({ societyId: fixture.society._id, sourceId: createRes.body.data._id });
    expect(ledgerEntry).toBeNull();
  });

  it('lists and fetches receipts, then bounces a verified payment with reversal', async () => {
    const verified = await createVerifiedPaymentFixture();

    const listRes = await request(app)
      .get('/api/mcr/receipts')
      .set('Authorization', `Bearer ${verified.fixture.adminToken}`);

    expect(listRes.status).toBe(200);
    expect(listRes.body.data).toHaveLength(1);
    expect(listRes.body.data[0]._id).toBe(verified.receiptId);

    const getRes = await request(app)
      .get(`/api/mcr/receipts/${verified.receiptId}`)
      .set('Authorization', `Bearer ${verified.fixture.adminToken}`);

    expect(getRes.status).toBe(200);
    expect(getRes.body.data.receiptNumber).toBe(verified.receiptNumber);

    const bounceRes = await request(app)
      .post(`/api/mcr/payments/${verified.paymentId}/bounce`)
      .set('Authorization', `Bearer ${verified.fixture.adminToken}`)
      .send({ reason: 'Cheque returned unpaid' });

    expect(bounceRes.status).toBe(200);
    expect(bounceRes.body.data.payment.status).toBe('BOUNCED');
    expect(bounceRes.body.data.receipt.status).toBe('VOID');
    expect(bounceRes.body.data.reversedAllocationCount).toBe(1);

    const demand = await MaintenanceDemand.findOne({ _id: verified.demandId, societyId: verified.fixture.society._id });
    expect(demand!.status).toBe('PUBLISHED');
    expect(demand!.paidPaise).toBe(0);
    expect(demand!.outstandingPaise).toBe(500000);

    const allocation = await McrPaymentAllocation.findOne({
      societyId: verified.fixture.society._id,
      paymentId: verified.paymentId,
      demandId: verified.demandId,
    });
    expect(allocation!.reversedAt).toBeTruthy();
    expect(allocation!.reversalReason).toBe('Cheque returned unpaid');

    const paymentEntries = await LedgerEntry.find({
      societyId: verified.fixture.society._id,
      sourceType: 'PAYMENT',
      sourceId: verified.paymentId,
    }).sort({ createdAt: 1 });
    expect(paymentEntries).toHaveLength(2);
    expect(paymentEntries[0].creditPaise).toBe(500000);
    expect(paymentEntries[1].debitPaise).toBe(500000);

    const receipt = await McrReceipt.findOne({ _id: verified.receiptId, societyId: verified.fixture.society._id });
    expect(receipt!.status).toBe('VOID');
    expect(receipt!.voidReason).toBe('Cheque returned unpaid');
  });
});
