import mongoose from 'mongoose';
import { MaintenanceDemand } from '../modules/mcr/demand.model';
import { McrPaymentRecord } from '../modules/mcr/mcrPaymentRecord.model';
import { mcrNumberingService } from '../modules/mcr/mcrNumbering.service';
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

function buildDemandInput(fixture: any, flat: any, billingPlanId: mongoose.Types.ObjectId) {
  return {
    societyId: fixture.society._id,
    billingPlanId,
    flatId: flat._id,
    billingPeriodKey: '2026-07',
    billingPeriodLabel: 'July 2026',
    status: 'DRAFT',
    residentSnapshot: { name: 'Resident', mobile: '9000000001' },
    flatSnapshot: { flatNo: flat.flatNo },
    issueDate: new Date('2026-07-01T00:00:00.000Z'),
    dueDate: new Date('2026-07-10T00:00:00.000Z'),
    chargeLines: [{
      chargeHeadId: new mongoose.Types.ObjectId(),
      chargeCode: 'MAINT',
      chargeName: 'Maintenance',
      amountPaise: 125000,
      calculationMethod: 'FIXED_FLAT',
    }],
    subtotalPaise: 125000,
    totalDemandPaise: 125000,
    paidPaise: 0,
    outstandingPaise: 125000,
    version: 1,
    createdBy: fixture.admin._id,
    updatedBy: fixture.admin._id,
  };
}

describe('MCR tenant-safe unique keys', () => {
  it('prevents duplicate draft identity within one society while allowing reuse across societies', async () => {
    const first = await createMcrFixture();
    const second = await createMcrFixture();
    const firstFlat = await createMcrFlat(first, 'A-102');
    const secondFlat = await createMcrFlat(second, 'B-201');
    const billingPlanId = new mongoose.Types.ObjectId();

    await MaintenanceDemand.create({
      ...buildDemandInput(first, firstFlat, billingPlanId),
      demandNumber: 'DMD/2026-07/000001',
    });

    await expect(MaintenanceDemand.create({
      ...buildDemandInput(first, firstFlat, billingPlanId),
      demandNumber: 'DMD/2026-07/000002',
    })).rejects.toMatchObject({ code: 11000 });

    const otherSocietyDemand = await MaintenanceDemand.create({
      ...buildDemandInput(second, secondFlat, billingPlanId),
      demandNumber: 'DMD/2026-07/000001',
    });

    expect(otherSocietyDemand.billingPeriodKey).toBe('2026-07');
  });

  it('keeps payment idempotency keys unique per society', async () => {
    const first = await createMcrFixture();
    const second = await createMcrFixture();
    const firstFlat = await createMcrFlat(first, 'A-103');
    const secondFlat = await createMcrFlat(second, 'B-202');
    const idempotencyKey = 'upi-ref-12345';

    const firstPaymentNumber = await mcrNumberingService.nextPaymentNumber(first.society._id.toString(), new Date('2026-07-25T00:00:00.000Z'));
    const secondPaymentNumber = await mcrNumberingService.nextPaymentNumber(first.society._id.toString(), new Date('2026-07-25T00:00:00.000Z'));
    const otherSocietyNumber = await mcrNumberingService.nextPaymentNumber(second.society._id.toString(), new Date('2026-07-25T00:00:00.000Z'));

    await McrPaymentRecord.create({
      societyId: first.society._id,
      paymentNumber: firstPaymentNumber,
      flatId: firstFlat._id,
      payerName: 'Resident One',
      amountPaise: 125000,
      paymentMethod: 'UPI',
      paymentDate: new Date('2026-07-25T00:00:00.000Z'),
      receivedDate: new Date('2026-07-25T00:00:00.000Z'),
      idempotencyKey,
      enteredBy: first.admin._id,
    });

    await expect(McrPaymentRecord.create({
      societyId: first.society._id,
      paymentNumber: secondPaymentNumber,
      flatId: firstFlat._id,
      payerName: 'Resident One',
      amountPaise: 125000,
      paymentMethod: 'UPI',
      paymentDate: new Date('2026-07-25T00:00:00.000Z'),
      receivedDate: new Date('2026-07-25T00:00:00.000Z'),
      idempotencyKey,
      enteredBy: first.admin._id,
    })).rejects.toMatchObject({ code: 11000 });

    const otherSocietyPayment = await McrPaymentRecord.create({
      societyId: second.society._id,
      paymentNumber: otherSocietyNumber,
      flatId: secondFlat._id,
      payerName: 'Resident Two',
      amountPaise: 125000,
      paymentMethod: 'UPI',
      paymentDate: new Date('2026-07-25T00:00:00.000Z'),
      receivedDate: new Date('2026-07-25T00:00:00.000Z'),
      idempotencyKey,
      enteredBy: second.admin._id,
    });

    expect(otherSocietyPayment.idempotencyKey).toBe(idempotencyKey);
  });
});
