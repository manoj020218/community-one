import request from 'supertest';
import app from '../app';
import { connectTestDb, clearDb, createUserWithRole, seedRoles } from './helpers';
import { createMcrFixture } from './mcr.helpers';
import { sequenceCounterService } from '../modules/mcr/sequenceCounter.service';

beforeAll(async () => {
  await connectTestDb();
  await seedRoles();
});

afterEach(async () => {
  await clearDb();
  await seedRoles();
});

describe('MCR Phase 2 foundations', () => {
  it('creates default settings and persists updates', async () => {
    const fixture = await createMcrFixture();

    const getRes = await request(app)
      .get('/api/mcr/settings')
      .set('Authorization', `Bearer ${fixture.adminToken}`);

    expect(getRes.status).toBe(200);
    expect(getRes.body.data.defaultCurrency).toBe('INR');
    expect(getRes.body.data.receiptPrefix).toBe('MCR');

    const patchRes = await request(app)
      .patch('/api/mcr/settings')
      .set('Authorization', `Bearer ${fixture.adminToken}`)
      .send({ gracePeriodDays: 7, allowResidentPaymentSubmission: true });

    expect(patchRes.status).toBe(200);
    expect(patchRes.body.data.gracePeriodDays).toBe(7);
    expect(patchRes.body.data.allowResidentPaymentSubmission).toBe(true);
  });

  it('creates tenant-scoped charge heads and rejects same-society duplicates', async () => {
    const fixture = await createMcrFixture();

    const createRes = await request(app)
      .post('/api/mcr/charge-heads')
      .set('Authorization', `Bearer ${fixture.adminToken}`)
      .send({
        code: 'maint',
        name: 'Monthly Maintenance',
        category: 'MAINTENANCE',
        defaultAmountPaise: 125050,
        calculationMethod: 'FIXED_FLAT',
      });

    expect(createRes.status).toBe(201);
    expect(createRes.body.data.code).toBe('MAINT');
    expect(createRes.body.data.defaultAmountPaise).toBe(125050);

    const listRes = await request(app)
      .get('/api/mcr/charge-heads')
      .set('Authorization', `Bearer ${fixture.adminToken}`);

    expect(listRes.status).toBe(200);
    expect(listRes.body.data).toHaveLength(1);

    const duplicateRes = await request(app)
      .post('/api/mcr/charge-heads')
      .set('Authorization', `Bearer ${fixture.adminToken}`)
      .send({
        code: 'MAINT',
        name: 'Duplicate',
        category: 'MAINTENANCE',
        defaultAmountPaise: 100,
        calculationMethod: 'FIXED_FLAT',
      });

    expect(duplicateRes.status).toBe(409);
  });

  it('creates billing plans only with charge heads from the active society', async () => {
    const fixture = await createMcrFixture();
    const chargeHeadRes = await request(app)
      .post('/api/mcr/charge-heads')
      .set('Authorization', `Bearer ${fixture.adminToken}`)
      .send({
        code: 'WATER',
        name: 'Water Charges',
        category: 'WATER',
        defaultAmountPaise: 25000,
        calculationMethod: 'FIXED_FLAT',
      });

    const createPlanRes = await request(app)
      .post('/api/mcr/billing-plans')
      .set('Authorization', `Bearer ${fixture.adminToken}`)
      .send({
        name: 'Monthly Standard Plan',
        frequency: 'MONTHLY',
        billingDay: 1,
        dueDay: 10,
        effectiveFrom: '2026-07-01T00:00:00.000Z',
        chargeLines: [{
          chargeHeadId: chargeHeadRes.body.data._id,
          amountPaise: 25000,
          calculationMethod: 'FIXED_FLAT',
        }],
      });

    expect(createPlanRes.status).toBe(201);
    expect(createPlanRes.body.data.chargeLines).toHaveLength(1);

    const outsider = await createMcrFixture();

    const invalidRes = await request(app)
      .post('/api/mcr/billing-plans')
      .set('Authorization', `Bearer ${outsider.adminToken}`)
      .send({
        name: 'Invalid Cross Society Plan',
        frequency: 'MONTHLY',
        billingDay: 1,
        dueDay: 7,
        effectiveFrom: '2026-07-01T00:00:00.000Z',
        chargeLines: [{
          chargeHeadId: chargeHeadRes.body.data._id,
          amountPaise: 25000,
          calculationMethod: 'FIXED_FLAT',
        }],
      });

    expect(invalidRes.status).toBe(400);
  });

  it('increments sequence counters atomically per society and period key', async () => {
    const fixture = await createMcrFixture();

    const first = await sequenceCounterService.nextValue(fixture.society._id.toString(), 'RECEIPT', '2026');
    const second = await sequenceCounterService.nextValue(fixture.society._id.toString(), 'RECEIPT', '2026');
    const demandFirst = await sequenceCounterService.nextValue(fixture.society._id.toString(), 'DEMAND', '2026-07');

    expect(first).toBe(1);
    expect(second).toBe(2);
    expect(demandFirst).toBe(1);
  });
});
