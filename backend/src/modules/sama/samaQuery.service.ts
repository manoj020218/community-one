import { NotFoundError } from '../../common/errors/AppError';
import { buildPaginatedResult, parsePagination } from '../../common/utils/response';
import { SamaAttendanceEvent } from './samaAttendanceEvent.model';
import { SamaAccessEvent } from './samaAccessEvent.model';
import { SamaLeaveRecord } from './samaLeaveRecord.model';
import { SamaPayrollEntry } from './samaPayrollEntry.model';
import { SamaPayrollRun } from './samaPayrollRun.model';
import { SamaShift } from './samaShift.model';
import { SamaStaffProfile } from './samaStaffProfile.model';
import { SamaSyncRun } from './samaSyncRun.model';

export class SamaQueryService {
  async listStaff(societyId: string, query: Record<string, unknown>) {
    const filter: Record<string, unknown> = { societyId };
    if (typeof query.status === 'string' && query.status) filter.status = query.status;
    if (typeof query.search === 'string' && query.search.trim()) {
      const term = new RegExp(query.search.trim(), 'i');
      filter.$or = [{ fullName: term }, { employeeCode: term }, { department: term }];
    }
    return this.paginate(SamaStaffProfile, filter, query, { fullName: 1, createdAt: -1 });
  }

  async findStaffById(societyId: string, staffId: string) {
    const staff = await SamaStaffProfile.findOne({ _id: staffId, societyId });
    if (!staff) throw new NotFoundError('SAMA staff');
    return staff;
  }

  async listAttendanceEvents(societyId: string, query: Record<string, unknown>) {
    const filter: Record<string, unknown> = { societyId };
    if (typeof query.date === 'string' && query.date) filter.attendanceDate = query.date;
    if (typeof query.externalStaffId === 'string' && query.externalStaffId) filter.externalStaffId = query.externalStaffId;
    return this.paginate(SamaAttendanceEvent, filter, query, { attendanceDate: -1, createdAt: -1 });
  }

  async listShifts(societyId: string, query: Record<string, unknown>) {
    return this.paginate(SamaShift, { societyId }, query, { shiftName: 1, createdAt: -1 });
  }

  async listLeaves(societyId: string, query: Record<string, unknown>) {
    const filter: Record<string, unknown> = { societyId };
    if (typeof query.status === 'string' && query.status) filter.status = query.status;
    if (typeof query.externalStaffId === 'string' && query.externalStaffId) filter.externalStaffId = query.externalStaffId;
    return this.paginate(SamaLeaveRecord, filter, query, { fromDate: -1, createdAt: -1 });
  }

  async listPayrollRuns(societyId: string, query: Record<string, unknown>) {
    const filter: Record<string, unknown> = { societyId };
    if (typeof query.monthKey === 'string' && query.monthKey) filter.monthKey = query.monthKey;
    if (typeof query.status === 'string' && query.status) filter.status = query.status;
    return this.paginate(SamaPayrollRun, filter, query, { monthKey: -1, createdAt: -1 });
  }

  async findPayrollRunById(societyId: string, runId: string) {
    const run = await SamaPayrollRun.findOne({ _id: runId, societyId });
    if (!run) throw new NotFoundError('SAMA payroll run');
    const payslips = await SamaPayrollEntry.find({ societyId, externalRunId: run.externalRunId }).sort({ employeeName: 1 });
    return { run, payslips };
  }

  async listSyncRuns(societyId: string, query: Record<string, unknown>) {
    const filter: Record<string, unknown> = { societyId };
    if (typeof query.syncType === 'string' && query.syncType) filter.syncType = query.syncType;
    if (typeof query.status === 'string' && query.status) filter.status = query.status;
    return this.paginate(SamaSyncRun, filter, query, { startedAt: -1, createdAt: -1 });
  }

  async listAccessEvents(societyId: string, query: Record<string, unknown>) {
    const filter: Record<string, unknown> = { societyId };
    if (typeof query.eventType === 'string' && query.eventType) filter.eventType = query.eventType;
    if (typeof query.externalDeviceId === 'string' && query.externalDeviceId) filter.externalDeviceId = query.externalDeviceId;
    if (typeof query.jenixDeviceId === 'string' && query.jenixDeviceId) filter.jenixDeviceId = query.jenixDeviceId;
    if (typeof query.exceptionStatus === 'string' && query.exceptionStatus) filter.exceptionStatus = query.exceptionStatus;
    return this.paginate(SamaAccessEvent, filter, query, { occurredAt: -1, createdAt: -1 });
  }

  private async paginate(model: any, filter: Record<string, unknown>, query: Record<string, unknown>, sort: Record<string, 1 | -1>) {
    const { page, limit, skip } = parsePagination(query);
    const [items, total] = await Promise.all([
      model.find(filter).sort(sort).skip(skip).limit(limit),
      model.countDocuments(filter),
    ]);
    return buildPaginatedResult(items, total, page, limit);
  }
}

export const samaQueryService = new SamaQueryService();
