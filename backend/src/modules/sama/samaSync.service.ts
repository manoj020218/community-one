import { EdgeFolioAttendanceRecord, EdgeFolioClient, EdgeFolioEmployeeRecord } from './edgeFolio.client';
import { SamaActorContext } from './sama.access.service';
import { SamaAttendanceEvent } from './samaAttendanceEvent.model';
import { SamaStaffProfile } from './samaStaffProfile.model';
import { samaSourceService } from './samaSource.service';

function toDate(value?: string): Date | undefined {
  if (!value) return undefined;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

function toPaise(value?: number): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? Math.round(value * 100) : undefined;
}

function toExternalEventId(record: EdgeFolioAttendanceRecord): string {
  return record.eventId || [record.memberId, record.date, record.checkIn, record.checkOut].filter(Boolean).join(':');
}

export class SamaSyncService {
  async syncEmployees(context: SamaActorContext): Promise<Record<string, unknown>> {
    try {
      const client = new EdgeFolioClient(await samaSourceService.getClientConfig(context.societyId));
      const records = await client.listEmployees();
      const syncedAt = new Date();
      const ids = records.map((item) => String(item.id)).filter(Boolean);
      const existing = await SamaStaffProfile.find({
        societyId: context.societyId,
        sourceProvider: 'EDGEFOLIO',
        externalStaffId: { $in: ids },
      }).lean();
      const existingIds = new Set(existing.map((item) => item.externalStaffId));

      await SamaStaffProfile.bulkWrite(
        records.map((item) => ({
          updateOne: {
            filter: { societyId: context.societyId, sourceProvider: 'EDGEFOLIO', externalStaffId: String(item.id) },
            update: { $set: this.mapEmployee(context.societyId, item, syncedAt) },
            upsert: true,
          },
        }))
      );

      await samaSourceService.markSyncSuccess(context.societyId, 'lastEmployeeSyncAt');
      return this.buildSummary(records.length, ids, existingIds, syncedAt);
    } catch (error: any) {
      await samaSourceService.markSyncFailure(context.societyId, error.message || 'Employee sync failed');
      throw error;
    }
  }

  async syncAttendance(context: SamaActorContext, date?: string): Promise<Record<string, unknown>> {
    try {
      const client = new EdgeFolioClient(await samaSourceService.getClientConfig(context.societyId));
      const records = await client.listAttendance(date);
      const syncedAt = new Date();
      const ids = records.map((item) => toExternalEventId(item)).filter(Boolean);
      const existing = await SamaAttendanceEvent.find({
        societyId: context.societyId,
        sourceProvider: 'EDGEFOLIO',
        externalEventId: { $in: ids },
      }).lean();
      const existingIds = new Set(existing.map((item) => item.externalEventId));

      await SamaAttendanceEvent.bulkWrite(
        records.map((item) => ({
          updateOne: {
            filter: { societyId: context.societyId, sourceProvider: 'EDGEFOLIO', externalEventId: toExternalEventId(item) },
            update: { $set: this.mapAttendance(context.societyId, item, syncedAt) },
            upsert: true,
          },
        }))
      );

      await samaSourceService.markSyncSuccess(context.societyId, 'lastAttendanceSyncAt');
      return { ...this.buildSummary(records.length, ids, existingIds, syncedAt), date: date || null };
    } catch (error: any) {
      await samaSourceService.markSyncFailure(context.societyId, error.message || 'Attendance sync failed');
      throw error;
    }
  }

  private buildSummary(total: number, ids: string[], existingIds: Set<string>, syncedAt: Date): Record<string, unknown> {
    const createdCount = ids.filter((id) => !existingIds.has(id)).length;
    return {
      provider: 'EDGEFOLIO',
      importedCount: total,
      createdCount,
      updatedCount: total - createdCount,
      syncedAt,
    };
  }

  private mapEmployee(societyId: string, item: EdgeFolioEmployeeRecord, syncedAt: Date): Record<string, unknown> {
    return {
      societyId,
      sourceProvider: 'EDGEFOLIO',
      externalStaffId: String(item.id),
      employeeCode: item.empCode,
      fullName: item.name || item.empCode || String(item.id),
      email: item.email,
      phone: item.phone,
      department: item.department,
      designation: item.designation,
      joiningDate: toDate(item.joiningDate),
      status: item.status,
      workType: item.workType,
      appRole: item.appRole,
      allowRemoteAttendance: Boolean(item.allowRemoteAttendance),
      paymentMode: item.paymentMode,
      salaryPaise: toPaise(item.salary),
      externalUpdatedAt: toDate(item.updatedAt),
      lastSyncedAt: syncedAt,
      rawData: { ...item, salary: item.salary },
    };
  }

  private mapAttendance(societyId: string, item: EdgeFolioAttendanceRecord, syncedAt: Date): Record<string, unknown> {
    return {
      societyId,
      sourceProvider: 'EDGEFOLIO',
      externalEventId: toExternalEventId(item),
      externalStaffId: item.memberId,
      attendanceDate: item.date,
      checkInAt: item.checkIn,
      checkOutAt: item.checkOut,
      status: item.status,
      workedMinutes: typeof item.hoursWorked === 'number' ? Math.round(item.hoursWorked * 60) : undefined,
      faceMatch: item.faceMatch,
      employeeName: item.employeeName,
      department: item.department,
      externalUpdatedAt: toDate(item.updatedAt),
      lastSyncedAt: syncedAt,
      rawData: item,
    };
  }
}

export const samaSyncService = new SamaSyncService();
