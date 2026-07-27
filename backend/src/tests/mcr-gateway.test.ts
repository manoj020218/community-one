import request from 'supertest';
import app from '../app';
import { connectTestDb, clearDb, seedRoles } from './helpers';
import { createMcrFixture, createMcrFlat } from './mcr.helpers';

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
    .send({ code: 'GTW', name: 'Gateway Plan', category: 'MAINTENANCE', defaultAmountPaise: 500000, calculationMethod: 'FIXED_FLAT' })
    .then((res) => res.body.data._id as string);
  return request(app)
    .post('/api/mcr/billing-plans')
    .set('Authorization', `Bearer ${token}`)
    .send({
      name: 'Gateway Billing Plan',
      frequency: 'MONTHLY',
      billingDay: 1,
      dueDay: 10,
      effectiveFrom: '2026-01-01T00:00:00.000Z',
      chargeLines: [{ chargeHeadId, amountPaise: 500000, calculationMethod: 'FIXED_FLAT' }],
    })
    .then((res) => res.body.data._id as string);
}

describe('MCR gateway foundation', () => {
  it('creates a mock gateway order and auto-verifies on successful webhook', async () => {
    const fixture = await createMcrFixture();
    const flat = await createMcrFlat(fixture, 'GW-101');
    const billingPlanId = await createBillingPlan(fixture.adminToken);
    const demandId = await request(app)
      .post('/api/mcr/demands/drafts')
      .set('Authorization', `Bearer ${fixture.adminToken}`)
      .send({ billingPlanId, billingPeriodKey: '2026-10', billingPeriodLabel: 'October 2026', flatIds: [flat._id.toString()] })
      .then((res) => res.body.data.items[0]._id as string);
    await request(app).post(`/api/mcr/demands/${demandId}/publish`).set('Authorization', `Bearer ${fixture.adminToken}`).send({});

    await request(app)
      .patch('/api/mcr/gateway/config')
      .set('Authorization', `Bearer ${fixture.adminToken}`)
      .send({ enabled: true, provider: 'MOCK', webhookSecret: 'mock-secret', autoVerifySuccessfulPayments: true });

    const orderRes = await request(app)
      .post('/api/mcr/gateway/orders')
      .set('Authorization', `Bearer ${fixture.adminToken}`)
      .send({ flatId: flat._id.toString() });

    expect(orderRes.status).toBe(201);
    const webhookRes = await request(app)
      .post('/api/mcr/public/gateway/webhook/mock')
      .set('x-mcr-gateway-secret', 'mock-secret')
      .send({ orderId: orderRes.body.data.gatewayOrderId, paymentId: 'mock-pay-1', status: 'SUCCESS' });

    expect(webhookRes.status).toBe(200);
    expect(webhookRes.body.data.signatureStatus).toBe('VALID');

    const paymentRes = await request(app)
      .get(`/api/mcr/payments/${orderRes.body.data.paymentId}`)
      .set('Authorization', `Bearer ${fixture.adminToken}`);
    expect(paymentRes.status).toBe(200);
    expect(paymentRes.body.data.status).toBe('VERIFIED');
    expect(paymentRes.body.data.gatewayPaymentId).toBe('mock-pay-1');

    const receiptRes = await request(app)
      .get(`/api/mcr/payments/${orderRes.body.data.paymentId}/receipt`)
      .set('Authorization', `Bearer ${fixture.adminToken}`);
    expect(receiptRes.status).toBe(200);
  });
});
