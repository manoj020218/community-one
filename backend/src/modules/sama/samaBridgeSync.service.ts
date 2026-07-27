import {
  EdgeFolioClient,
  EdgeFolioLeaveRecord,
  EdgeFolioPayrollRunRecord,
  EdgeFolioPayslipRecord,
  EdgeFolioShiftRecord,
} from './edgeFolio.client';
import { SamaActorContext } from './sama.access.service';
import { SamaLeaveRecord } from './samaLeaveRecord.model';
import { SamaPayrollEntry } from './samaPayrollEntry.model';
import { SamaPayrollRun } from './samaPayrollRun.model';
import { SamaShift } from './samaShift.model';
import { samaSourceService } from './samaSource.service';

function toDate(value?: string): Date | undefined {
  if (!value) return undefined;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

function toPaise(value?: number): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? Math.round(value * 100) : undefined;
}

function toPaiseMap(values?: Record<string, unknown>): Record<string, number> {
  return Object.fromEntries(
    Object.entries(values || {})
      .filter(([, value]) => Number.isFinite(Number(value)))
      .map(([key, value]) => [key, Math.round(Number(value) * 100)])
  );
}

function maskBankAccount(value?: string): string | undefined {
  if (!value) return undefined;
  const tail = value.slice(-4);
  return tail ? `****${tail}` : undefined;
}

export class SamaBridgeSyncService {
  async syncShifts(context: SamaActorContext): Promise<Record<string, unknown>> {
    try {
      const client = new EdgeFolioClient(await samaSourceService.getClientConfig(context.societyId));
      const records = await client.listShifts();
      const syncedAt = new Date();
      const ids = records.map((item) => item.shiftId);
      const existingIds = await this.getExistingIds(SamaShift, context.societyId, 'externalShiftId', ids);
      await SamaShift.bulkWrite(records.map((item) => ({
        updateOne: {
          filter: { societyId: context.societyId, sourceProvider: 'EDGEFOLIO', externalShiftId: item.shiftId },
          update: { $set: this.mapShift(context.societyId, item, syncedAt) },
          upsert: true,
        },
      })));
      await samaSourceService.markSyncSuccess(context.societyId, 'lastShiftSyncAt');
      return this.buildSummary(records.length, ids, existingIds, syncedAt);
    } catch (error: any) {
      await samaSourceService.markSyncFailure(context.societyId, error.message || 'Shift sync failed');
      throw error;
    }
  }

  async syncLeaves(context: SamaActorContext): Promise<Record<string, unknown>> {
    try {
      const client = new EdgeFolioClient(await samaSourceService.getClientConfig(context.societyId));
      const records = await client.listLeaves();
      const syncedAt = new Date();
      const ids = records.map((item) => item.leaveId);
      const existingIds = await this.getExistingIds(SamaLeaveRecord, context.societyId, 'externalLeaveId', ids);
      await SamaLeaveRecord.bulkWrite(records.map((item) => ({
        updateOne: {
          filter: { societyId: context.societyId, sourceProvider: 'EDGEFOLIO', externalLeaveId: item.leaveId },
          update: { $set: this.mapLeave(context.societyId, item, syncedAt) },
          upsert: true,
        },
      })));
      await samaSourceService.markSyncSuccess(context.societyId, 'lastLeaveSyncAt');
      return this.buildSummary(records.length, ids, existingIds, syncedAt);
    } catch (error: any) {
      await samaSourceService.markSyncFailure(context.societyId, error.message || 'Leave sync failed');
      throw error;
    }
  }

  async syncPayroll(context: SamaActorContext, monthKey?: string): Promise<Record<string, unknown>> {
    try {
      const client = new EdgeFolioClient(await samaSourceService.getClientConfig(context.societyId));
      const runs = await client.listPayrollRuns();
      const filteredRuns = monthKey ? runs.filter((item) => item.monthKey === monthKey) : runs;
      const details = await Promise.all(filteredRuns.map((item) => client.getPayrollRunDetails(item.runId)));
      const syncedAt = new Date();
      const runIds = filteredRuns.map((item) => item.runId);
      const existingRunIds = await this.getExistingIds(SamaPayrollRun, context.societyId, 'externalRunId', runIds);
      const payslips = details.flatMap((detail) =>
        detail.payslips.map((item) => ({ ...item, runId: detail.run.runId, monthKey: detail.run.monthKey }))
      );
      const slipIds = payslips.map((item) => item.payslipId);
      const existingSlipIds = await this.getExistingIds(SamaPayrollEntry, context.societyId, 'externalPayslipId', slipIds);

      await SamaPayrollRun.bulkWrite(filteredRuns.map((item) => ({
        updateOne: {
          filter: { societyId: context.societyId, sourceProvider: 'EDGEFOLIO', externalRunId: item.runId },
          update: { $set: this.mapPayrollRun(context.societyId, item, syncedAt) },
          upsert: true,
        },
      })));
      if (payslips.length) {
        await SamaPayrollEntry.bulkWrite(payslips.map((item) => ({
          updateOne: {
            filter: { societyId: context.societyId, sourceProvider: 'EDGEFOLIO', externalPayslipId: item.payslipId },
            update: { $set: this.mapPayrollEntry(context.societyId, item, syncedAt) },
            upsert: true,
          },
        })));
      }

      await samaSourceService.markSyncSuccess(context.societyId, 'lastPayrollSyncAt');
      return {
        ...this.buildSummary(filteredRuns.length, runIds, existingRunIds, syncedAt),
        payslipImportedCount: payslips.length,
        payslipCreatedCount: slipIds.filter((id) => !existingSlipIds.has(id)).length,
        payslipUpdatedCount: payslips.length - slipIds.filter((id) => !existingSlipIds.has(id)).length,
        monthKey: monthKey || null,
      };
    } catch (error: any) {
      await samaSourceService.markSyncFailure(context.societyId, error.message || 'Payroll sync failed');
      throw error;
    }
  }

  private async getExistingIds(model: any, societyId: string, field: string, ids: string[]): Promise<Set<string>> {
    if (!ids.length) return new Set<string>();
    const rows = await model.find({ societyId, sourceProvider: 'EDGEFOLIO', [field]: { $in: ids } }).lean();
    return new Set(rows.map((item: Record<string, string>) => item[field]));
  }

  private buildSummary(total: number, ids: string[], existingIds: Set<string>, syncedAt: Date): Record<string, unknown> {
    const createdCount = ids.filter((id) => !existingIds.has(id)).length;
    return { provider: 'EDGEFOLIO', importedCount: total, createdCount, updatedCount: total - createdCount, syncedAt };
  }

  private mapShift(societyId: string, item: EdgeFolioShiftRecord, syncedAt: Date): Record<string, unknown> {
    return { societyId, sourceProvider: 'EDGEFOLIO', externalShiftId: item.shiftId, shiftName: item.shiftName, startTime: item.startTime, endTime: item.endTime, breakDurationMinutes: item.breakDuration, employeeCount: item.employees, externalUpdatedAt: toDate(item.updatedAt), lastSyncedAt: syncedAt, rawData: item };
  }

  private mapLeave(societyId: string, item: EdgeFolioLeaveRecord, syncedAt: Date): Record<string, unknown> {
    return { societyId, sourceProvider: 'EDGEFOLIO', externalLeaveId: item.leaveId, externalStaffId: item.employeeId, employeeName: item.employeeName, leaveType: item.leaveType, fromDate: item.fromDate, toDate: item.toDate, days: item.days, reason: item.reason, status: item.status, requestDate: item.requestDate, approvedBy: item.approvedBy, externalUpdatedAt: toDate(item.updatedAt), lastSyncedAt: syncedAt, rawData: item };
  }

  private mapPayrollRun(societyId: string, item: EdgeFolioPayrollRunRecord, syncedAt: Date): Record<string, unknown> {
    return { societyId, sourceProvider: 'EDGEFOLIO', externalRunId: item.runId, monthKey: item.monthKey, monthLabel: item.monthLabel, year: item.year, status: item.status, totalEmployees: item.totalEmployees, processedCount: item.processed, totalAmountPaise: toPaise(item.totalAmount), processedDate: item.processedDate, processedBy: item.processedBy, externalUpdatedAt: toDate(item.updatedAt), lastSyncedAt: syncedAt, rawData: item };
  }

  private mapPayrollEntry(societyId: string, item: EdgeFolioPayslipRecord & { runId: string; monthKey: string }, syncedAt: Date): Record<string, unknown> {
    return { societyId, sourceProvider: 'EDGEFOLIO', externalPayslipId: item.payslipId, externalRunId: item.runId, externalStaffId: item.employeeId, empCode: item.empCode, employeeName: item.employeeName, employeeEmail: item.employeeEmail, employeePhone: item.employeePhone, monthKey: item.monthKey, basicSalaryPaise: toPaise(item.basicSalary), earnings: toPaiseMap(item.earnings), deductions: toPaiseMap(item.deductions), grossPaise: toPaise(item.gross), netSalaryPaise: toPaise(item.netSalary), bankAccountMasked: maskBankAccount(item.bankAccount), status: item.status, dispute: item.dispute || null, externalUpdatedAt: toDate(item.updatedAt), lastSyncedAt: syncedAt, rawData: { ...item, bankAccount: undefined } };
  }
}

export const samaBridgeSyncService = new SamaBridgeSyncService();
