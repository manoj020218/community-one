import request from 'supertest';
import app from '../app';
import { connectTestDb, clearDb, createUserWithRole, seedRoles } from './helpers';
import { createMcrFixture, createMcrFlat } from './mcr.helpers';
import { FileAsset } from '../modules/fileAsset/fileAsset.model';
import { LedgerEntry } from '../modules/mcr/ledger.model';
import { MaintenanceDemand } from '../modules/mcr/demand.model';
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

async function createPublishedDemand(token: string, billingPlanId: string, periodKey: string, flatId: string) {
  const draftRes = await request(app)
    .post('/api/mcr/demands/drafts')
    .set('Authorization', `Bearer ${token}`)
    .send({ billingPlanId, billingPeriodKey: periodKey, billingPeriodLabel: periodKey, flatIds: [flatId] });
  const demandId = draftRes.body.data.items[0]._id;
  await request(app)
    .post(`/api/mcr/demands/${demandId}/publish`)
    .set('Authorization', `Bearer ${token}`)
    .send({});
  return demandId as string;
}

describe('MCR payment collection flow', () => {
  it('blocks self-verification, then allocates and receipts a verified payment', async () => {
    const fixture = await createMcrFixture();
    const { token: verifierToken } = await createUserWithRole({
      roleCode: 'SOCIETY_ADMIN',
      societyId: fixture.society._id.toString(),
      email: `verifier-${Date.now()}@test.com`,
    });
    const flat = await createMcrFlat(fixture, 'A-101');
    const billingPlanId = await createBillingPlan(fixture);
    const julyDemandId = await createPublishedDemand(fixture.adminToken, billingPlanId, '2026-07', flat._id.toString());
    await createPublishedDemand(fixture.adminToken, billingPlanId, '2026-08', flat._id.toString());
    const proof = await FileAsset.create({
      societyId: fixture.society._id,
      uploadedBy: fixture.admin._id,
      moduleCode: 'MCR',
      fileName: 'proof-a101.png',
      originalName: 'proof-a101.png',
      mimeType: 'image/png',
      size: 2048,
      url: '/uploads/proof-a101.png',
    });

    const createRes = await request(app)
      .post('/api/mcr/payments')
      .set('Authorization', `Bearer ${fixture.adminToken}`)
      .send({
        flatId: flat._id.toString(),
        payerName: 'Resident A-101',
        payerMobile: '9876543210',
        amountPaise: 700000,
        paymentMethod: 'UPI',
        upiReference: 'UPI-700000',
        proofFileIds: [proof._id.toString()],
      });

    expect(createRes.status).toBe(201);
    expect(createRes.body.data.status).toBe('PENDING_VERIFICATION');
    expect(createRes.body.data.paymentNumber).toContain('MCRP/2026/');

    const selfVerifyRes = await request(app)
      .post(`/api/mcr/payments/${createRes.body.data._id}/verify`)
      .set('Authorization', `Bearer ${fixture.adminToken}`)
      .send({});

    expect(selfVerifyRes.status).toBe(403);

    const verifyRes = await request(app)
      .post(`/api/mcr/payments/${createRes.body.data._id}/verify`)
      .set('Authorization', `Bearer ${verifierToken}`)
      .send({});

    expect(verifyRes.status).toBe(200);
    expect(verifyRes.body.data.payment.status).toBe('VERIFIED');
    expect(verifyRes.body.data.allocations).toHaveLength(2);
    expect(verifyRes.body.data.receipt.receiptNumber).toContain('MCR/2026/');

    const demands = await MaintenanceDemand.find({
      _id: { $in: [julyDemandId] },
      societyId: fixture.society._id,
    });
    expect(demands[0].status).toBe('PAID');
    expect(demands[0].outstandingPaise).toBe(0);

    const augustDemand = await MaintenanceDemand.findOne({
      societyId: fixture.society._id,
      billingPeriodKey: '2026-08',
      flatId: flat._id,
    });
    expect(augustDemand!.status).toBe('PARTIALLY_PAID');
    expect(augustDemand!.outstandingPaise).toBe(300000);

    const ledgerEntry = await LedgerEntry.findOne({
      societyId: fixture.society._id,
      sourceType: 'PAYMENT',
      sourceId: createRes.body.data._id,
    });
    expect(ledgerEntry).not.toBeNull();
    expect(ledgerEntry!.creditPaise).toBe(700000);
    expect(ledgerEntry!.runningBalancePaise).toBe(300000);

    const receipt = await McrReceipt.findOne({ societyId: fixture.society._id, paymentId: createRes.body.data._id });
    expect(receipt).not.toBeNull();
    expect(receipt!.allocationSnapshot).toHaveLength(2);
  });

  it('rejects a pending payment with maker-checker separation', async () => {
    const fixture = await createMcrFixture();
    const { token: verifierToken } = await createUserWithRole({
      roleCode: 'SOCIETY_ADMIN',
      societyId: fixture.society._id.toString(),
      email: `rejector-${Date.now()}@test.com`,
    });
    const flat = await createMcrFlat(fixture, 'A-102');
    const createRes = await request(app)
      .post('/api/mcr/payments')
      .set('Authorization', `Bearer ${fixture.adminToken}`)
      .send({
        flatId: flat._id.toString(),
        payerName: 'Resident A-102',
        amountPaise: 300000,
        paymentMethod: 'CASH',
        cashCollectionReference: 'CASH-COUNTER-1',
      });

    const rejectRes = await request(app)
      .post(`/api/mcr/payments/${createRes.body.data._id}/reject`)
      .set('Authorization', `Bearer ${verifierToken}`)
      .send({ reason: 'Deposit slip mismatch' });

    expect(rejectRes.status).toBe(200);
    expect(rejectRes.body.data.status).toBe('REJECTED');
    expect(rejectRes.body.data.rejectionReason).toBe('Deposit slip mismatch');
  });
});
