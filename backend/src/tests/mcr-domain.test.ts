import { buildDefaultMcrSettingsInput } from '../modules/mcr/mcrSettings.schemas';
import { McrSettings } from '../modules/mcr/mcrSettings.model';
import { mcrNumberingService } from '../modules/mcr/mcrNumbering.service';
import { ledgerService } from '../modules/mcr/ledger.service';
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

describe('MCR domain foundation', () => {
  it('formats official demand and receipt numbers from society settings', async () => {
    const fixture = await createMcrFixture();
    await McrSettings.create({
      societyId: fixture.society._id,
      ...buildDefaultMcrSettingsInput(),
      receiptPrefix: 'RCT',
      demandNumberPrefix: 'DMD',
      updatedBy: fixture.admin._id,
    });

    const demandOne = await mcrNumberingService.nextDemandNumber(fixture.society._id.toString(), new Date('2026-07-25T00:00:00.000Z'));
    const demandTwo = await mcrNumberingService.nextDemandNumber(fixture.society._id.toString(), new Date('2026-07-25T00:00:00.000Z'));
    const receiptOne = await mcrNumberingService.nextReceiptNumber(fixture.society._id.toString(), new Date('2026-07-25T00:00:00.000Z'));

    expect(demandOne).toBe('DMD/2026-07/000001');
    expect(demandTwo).toBe('DMD/2026-07/000002');
    expect(receiptOne).toBe('RCT/2026/000001');
  });

  it('posts immutable ledger entries with running balances and reversals', async () => {
    const fixture = await createMcrFixture();
    const flat = await createMcrFlat(fixture, 'A-101');

    const demandEntry = await ledgerService.postEntry({
      societyId: fixture.society._id.toString(),
      flatId: flat._id.toString(),
      entryType: 'DEMAND',
      sourceType: 'DEMAND',
      sourceId: 'demand-1',
      debitPaise: 500000,
      description: 'July demand',
      createdBy: fixture.admin._id.toString(),
      entryDate: new Date('2026-07-01T00:00:00.000Z'),
    });

    const paymentEntry = await ledgerService.postEntry({
      societyId: fixture.society._id.toString(),
      flatId: flat._id.toString(),
      entryType: 'PAYMENT',
      sourceType: 'PAYMENT',
      sourceId: 'payment-1',
      creditPaise: 200000,
      description: 'Part payment',
      createdBy: fixture.admin._id.toString(),
      entryDate: new Date('2026-07-05T00:00:00.000Z'),
    });

    const reversal = await ledgerService.reverseEntry(
      demandEntry._id.toString(),
      fixture.admin._id.toString(),
      'Demand reversed',
      new Date('2026-07-06T00:00:00.000Z')
    );

    expect(demandEntry.entryNumber).toBe('MCRL/2026/000001');
    expect(paymentEntry.entryNumber).toBe('MCRL/2026/000002');
    expect(paymentEntry.runningBalancePaise).toBe(300000);
    expect(reversal.entryNumber).toBe('MCRL/2026/000003');
    expect(reversal.reversalOfEntryId?.toString()).toBe(demandEntry._id.toString());
    expect(reversal.runningBalancePaise).toBe(-200000);
  });
});
