import request from 'supertest';
import app from '../app';
import { connectTestDb, clearDb, createUserWithRole, seedRoles } from './helpers';
import { createMcrFixture, createMcrFlat } from './mcr.helpers';
import { McrNotificationDispatch } from '../modules/mcr/mcrNotificationDispatch.model';
import { Notification } from '../modules/notification/notification.model';
import { Resident } from '../modules/resident/resident.model';

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
    .send({ code: 'RCT', name: 'Receipt Maintenance', category: 'MAINTENANCE', defaultAmountPaise: 500000, calculationMethod: 'FIXED_FLAT' })
    .then((res) => res.body.data._id as string);
  return request(app)
    .post('/api/mcr/billing-plans')
    .set('Authorization', `Bearer ${token}`)
    .send({
      name: 'Receipt Plan',
      frequency: 'MONTHLY',
      billingDay: 1,
      dueDay: 10,
      effectiveFrom: '2026-07-01T00:00:00.000Z',
      chargeLines: [{ chargeHeadId, amountPaise: 500000, calculationMethod: 'FIXED_FLAT' }],
    })
    .then((res) => res.body.data._id as string);
}

async function createVerifiedReceipt() {
  const fixture = await createMcrFixture();
  const { user: verifier, token: verifierToken } = await createUserWithRole({
    roleCode: 'SOCIETY_ADMIN',
    societyId: fixture.society._id.toString(),
    email: `receipt-verifier-${Date.now()}@test.com`,
  });
  const { user: owner } = await createUserWithRole({
    roleCode: 'OWNER',
    societyId: fixture.society._id.toString(),
    email: `receipt-owner-${Date.now()}@test.com`,
  });
  const flat = await createMcrFlat(fixture, 'R-101');
  await Resident.findOneAndUpdate({ societyId: fixture.society._id, flatId: flat._id, primaryContact: true }, { userId: owner._id });
  const billingPlanId = await createBillingPlan(fixture.adminToken);
  const demandId = await request(app)
    .post('/api/mcr/demands/drafts')
    .set('Authorization', `Bearer ${fixture.adminToken}`)
    .send({ billingPlanId, billingPeriodKey: '2026-12', billingPeriodLabel: 'December 2026', flatIds: [flat._id.toString()] })
    .then((res) => res.body.data.items[0]._id as string);
  await request(app).post(`/api/mcr/demands/${demandId}/publish`).set('Authorization', `Bearer ${fixture.adminToken}`).send({});

  const paymentId = await request(app)
    .post('/api/mcr/payments')
    .set('Authorization', `Bearer ${fixture.adminToken}`)
    .send({ flatId: flat._id.toString(), payerName: 'Receipt Owner', amountPaise: 500000, paymentMethod: 'UPI', upiReference: 'RCT-UPI-1' })
    .then((res) => res.body.data._id as string);
  await request(app).patch('/api/mcr/settings').set('Authorization', `Bearer ${fixture.adminToken}`).send({ publicReceiptVerificationEnabled: true });

  const verifyRes = await request(app)
    .post(`/api/mcr/payments/${paymentId}/verify`)
    .set('Authorization', `Bearer ${verifierToken}`)
    .send({});

  return { fixture, verifier, verifierToken, owner, flat, paymentId, receiptId: verifyRes.body.data.receipt._id as string };
}

describe('MCR receipt public and lifecycle flows', () => {
  it('exposes share links and renders public verification/document output', async () => {
    const { fixture, receiptId } = await createVerifiedReceipt();
    const shareRes = await request(app)
      .get(`/api/mcr/receipts/${receiptId}/share`)
      .set('Authorization', `Bearer ${fixture.adminToken}`);

    expect(shareRes.status).toBe(200);
    expect(shareRes.body.data.verificationUrl).toContain('/api/mcr/public/receipts/verify?token=');
    expect(shareRes.body.data.documentUrl).toContain('/api/mcr/public/receipts/document?token=');

    const token = new URL(shareRes.body.data.verificationUrl).searchParams.get('token');
    const verifyRes = await request(app).get(`/api/mcr/public/receipts/verify?token=${encodeURIComponent(token!)}`);
    expect(verifyRes.status).toBe(200);
    expect(verifyRes.body.data.receiptNumber).toBeTruthy();
    expect(verifyRes.body.data.societyName).toBe(fixture.society.name);

    const documentRes = await request(app).get(`/api/mcr/public/receipts/document?token=${encodeURIComponent(token!)}`);
    expect(documentRes.status).toBe(200);
    expect(documentRes.headers['content-type']).toContain('text/html');
    expect(documentRes.text).toContain('Maintenance Receipt');

    const posterRes = await request(app).get(`/api/mcr/public/receipts/poster?token=${encodeURIComponent(token!)}`);
    expect(posterRes.status).toBe(200);
    expect(posterRes.headers['content-type']).toContain('image/svg+xml');
    expect(posterRes.text).toContain('<svg');
  });

  it('replaces an active receipt and dispatches it in-app', async () => {
    const { fixture, owner, receiptId } = await createVerifiedReceipt();
    const replaceRes = await request(app)
      .post(`/api/mcr/receipts/${receiptId}/replace`)
      .set('Authorization', `Bearer ${fixture.adminToken}`)
      .send({ reason: 'Regenerated receipt for corrected public copy' });

    expect(replaceRes.status).toBe(200);
    expect(replaceRes.body.data.replacedReceipt.status).toBe('REPLACED');
    expect(replaceRes.body.data.receipt.receiptNumber).not.toBe(replaceRes.body.data.replacedReceipt.receiptNumber);

    const sendRes = await request(app)
      .post(`/api/mcr/receipts/${replaceRes.body.data.receipt._id}/send`)
      .set('Authorization', `Bearer ${fixture.adminToken}`)
      .send({ channels: ['IN_APP'] });

    expect(sendRes.status).toBe(200);
    expect(sendRes.body.data.results[0].status).toBe('SENT');

    const notification = await Notification.findOne({ userId: owner._id, entityId: replaceRes.body.data.receipt._id }).orFail();
    expect(notification.moduleCode).toBe('MCR');
    const dispatch = await McrNotificationDispatch.findOne({ entityId: replaceRes.body.data.receipt._id, channel: 'IN_APP' }).orFail();
    expect(dispatch.status).toBe('SENT');
  });
});
