import request from 'supertest';
import app from '../app';
import { clearDb, connectTestDb, createUserWithRole, seedRoles } from './helpers';
import { SamaAttendanceEvent } from '../modules/sama/samaAttendanceEvent.model';
import { SamaPayrollEntry } from '../modules/sama/samaPayrollEntry.model';
import { SamaPayrollRun } from '../modules/sama/samaPayrollRun.model';
import { SamaSource } from '../modules/sama/samaSource.model';
import { SamaStaffProfile } from '../modules/sama/samaStaffProfile.model';
import { SamaSyncRun } from '../modules/sama/samaSyncRun.model';
import { createSamaSociety, enableSamaModule } from './sama.helpers';

beforeAll(async () => {
  await connectTestDb();
  await seedRoles();
});

afterEach(async () => {
  jest.restoreAllMocks();
  await clearDb();
  await seedRoles();
});

describe('SAMA bridge sync', () => {
  it('stores the source, syncs bridge domains, and exposes backend read endpoints', async () => {
    const society = await createSamaSociety();
    const { user, token } = await createUserWithRole({
      roleCode: 'SOCIETY_ADMIN',
      societyId: society._id.toString(),
    });
    await enableSamaModule(society._id.toString(), user._id.toString());

    const sourceRes = await request(app)
      .patch('/api/sama/source')
      .set('Authorization', `Bearer ${token}`)
      .send({ baseUrl: 'http://edgefolio.local', accessToken: 'edge-token', apiPrefix: '/api/v1' });

    expect(sourceRes.status).toBe(200);
    expect(sourceRes.body.data.hasAccessToken).toBe(true);
    expect(sourceRes.body.data.baseUrl).toBe('http://edgefolio.local');

    const fetchMock = jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [{ id: 'emp-1', empCode: 'E001', name: 'Ravi', salary: 12345.67, department: 'Ops' }],
        }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [{ eventId: 'evt-1', memberId: 'emp-1', date: '2026-07-24', hoursWorked: 8.5, employeeName: 'Ravi' }],
        }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [{ leaveId: 'leave-1', employeeId: 'emp-1', employeeName: 'Ravi', leaveType: 'CASUAL', fromDate: '2026-07-20', toDate: '2026-07-20', days: 1, status: 'APPROVED' }],
        }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [{ shiftId: 'shift-1', shiftName: 'Morning', startTime: '08:00', endTime: '17:00', breakDuration: 60, employees: 4 }],
        }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [{ runId: 'run-1', monthKey: '2026-07', monthLabel: 'July 2026', status: 'APPROVED', totalEmployees: 1, processed: 1, totalAmount: 12345.67 }],
        }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            run: { runId: 'run-1', monthKey: '2026-07', monthLabel: 'July 2026', status: 'APPROVED', totalEmployees: 1, processed: 1, totalAmount: 12345.67 },
            payslips: [{ payslipId: 'slip-1', employeeId: 'emp-1', employeeName: 'Ravi', month: '2026-07', basicSalary: 10000, gross: 12345.67, netSalary: 12000, bankAccount: '1234567890', earnings: { base: 10000 }, deductions: { pf: 345.67 } }],
          },
        }),
      } as Response);

    const employeeRes = await request(app)
      .post('/api/sama/sync/employees')
      .set('Authorization', `Bearer ${token}`)
      .send({});

    const attendanceRes = await request(app)
      .post('/api/sama/sync/attendance')
      .set('Authorization', `Bearer ${token}`)
      .send({ date: '2026-07-24' });
    const leaveRes = await request(app).post('/api/sama/sync/leaves').set('Authorization', `Bearer ${token}`).send({});
    const shiftRes = await request(app).post('/api/sama/sync/shifts').set('Authorization', `Bearer ${token}`).send({});
    const payrollRes = await request(app).post('/api/sama/sync/payroll').set('Authorization', `Bearer ${token}`).send({ monthKey: '2026-07' });

    expect(employeeRes.status).toBe(200);
    expect(employeeRes.body.data.importedCount).toBe(1);
    expect(attendanceRes.status).toBe(200);
    expect(attendanceRes.body.data.importedCount).toBe(1);
    expect(leaveRes.status).toBe(200);
    expect(shiftRes.status).toBe(200);
    expect(payrollRes.status).toBe(200);
    expect(payrollRes.body.data.payslipImportedCount).toBe(1);
    expect(fetchMock).toHaveBeenCalledTimes(6);

    const staffListRes = await request(app).get('/api/sama/staff').set('Authorization', `Bearer ${token}`);
    const attendanceListRes = await request(app).get('/api/sama/attendance-events').set('Authorization', `Bearer ${token}`);
    const leaveListRes = await request(app).get('/api/sama/leaves').set('Authorization', `Bearer ${token}`);
    const shiftListRes = await request(app).get('/api/sama/shifts').set('Authorization', `Bearer ${token}`);
    const payrollListRes = await request(app).get('/api/sama/payroll-runs').set('Authorization', `Bearer ${token}`);
    const syncRunListRes = await request(app).get('/api/sama/sync-runs').set('Authorization', `Bearer ${token}`);

    const source = await SamaSource.findOne({ societyId: society._id });
    const staff = await SamaStaffProfile.findOne({ societyId: society._id, externalStaffId: 'emp-1' });
    const attendance = await SamaAttendanceEvent.findOne({ societyId: society._id, externalEventId: 'evt-1' });
    const payrollRun = await SamaPayrollRun.findOne({ societyId: society._id, externalRunId: 'run-1' });
    const payslip = await SamaPayrollEntry.findOne({ societyId: society._id, externalPayslipId: 'slip-1' });
    const syncRuns = await SamaSyncRun.find({ societyId: society._id });

    expect(source?.encryptedAccessToken).toBeTruthy();
    expect(source?.lastEmployeeSyncAt).toBeTruthy();
    expect(source?.lastAttendanceSyncAt).toBeTruthy();
    expect(source?.lastLeaveSyncAt).toBeTruthy();
    expect(source?.lastShiftSyncAt).toBeTruthy();
    expect(source?.lastPayrollSyncAt).toBeTruthy();
    expect(staff?.salaryPaise).toBe(1234567);
    expect(attendance?.workedMinutes).toBe(510);
    expect(payrollRun?.totalAmountPaise).toBe(1234567);
    expect(payslip?.grossPaise).toBe(1234567);
    expect(payslip?.bankAccountMasked).toBe('****7890');
    expect(syncRuns).toHaveLength(5);
    expect(syncRuns.every((item) => item.status === 'SUCCESS')).toBe(true);

    expect(staffListRes.status).toBe(200);
    expect(staffListRes.body.data.items).toHaveLength(1);
    expect(attendanceListRes.body.data.items[0].workedMinutes).toBe(510);
    expect(leaveListRes.body.data.items[0].leaveType).toBe('CASUAL');
    expect(shiftListRes.body.data.items[0].shiftName).toBe('Morning');
    expect(payrollListRes.body.data.items[0].monthKey).toBe('2026-07');
    expect(syncRunListRes.body.data.items).toHaveLength(5);

    const payrollRunDetailRes = await request(app)
      .get(`/api/sama/payroll-runs/${payrollRun!._id.toString()}`)
      .set('Authorization', `Bearer ${token}`);

    expect(payrollRunDetailRes.status).toBe(200);
    expect(payrollRunDetailRes.body.data.payslips).toHaveLength(1);
  });
});
