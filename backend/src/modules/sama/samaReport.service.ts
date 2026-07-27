import mongoose from 'mongoose';
import { HouseholdAssociation } from './householdAssociation.model';
import { HouseholdPaymentRecord } from './householdPaymentRecord.model';
import { SamaAccessEvent } from './samaAccessEvent.model';
import { samaSourceService } from './samaSource.service';
import { ServiceProviderProfile } from './serviceProviderProfile.model';
import { StaffCategory } from './staffCategory.model';
import { StaffProfile } from './staffProfile.model';
import { WorkOrder } from './workOrder.model';

function toCsv(rows: Record<string, unknown>[]) {
  if (!rows.length) return '';
  const headers = Object.keys(rows[0]);
  const lines = rows.map((row) => headers.map((key) => `"${String(row[key] ?? '').replace(/"/g, '""')}"`).join(','));
  return [headers.join(','), ...lines].join('\n');
}

function objectId(societyId: string) {
  return new mongoose.Types.ObjectId(societyId);
}

export class SamaReportService {
  async getDashboard(societyId: string) {
    const [staffCount, categoryCount, activeAssociationCount, providerCount, workOrders, householdTotals, suspendedStaffCount, terminatedStaffCount, unresolvedAccessExceptionCount, syncHealth] = await Promise.all([
      StaffProfile.countDocuments({ societyId }),
      StaffCategory.countDocuments({ societyId, isActive: true }),
      HouseholdAssociation.countDocuments({ societyId, status: 'ACTIVE' }),
      ServiceProviderProfile.countDocuments({ societyId, status: 'ACTIVE' }),
      WorkOrder.aggregate([{ $match: { societyId: objectId(societyId) } }, { $group: { _id: '$status', count: { $sum: 1 }, slaBreached: { $sum: { $cond: ['$slaBreached', 1, 0] } } } }]),
      HouseholdPaymentRecord.aggregate([{ $match: { societyId: objectId(societyId) } }, { $group: { _id: null, due: { $sum: '$duePaise' }, paid: { $sum: '$paidPaise' } } }]),
      StaffProfile.countDocuments({ societyId, lifecycleStatus: 'SUSPENDED' }),
      StaffProfile.countDocuments({ societyId, lifecycleStatus: 'TERMINATED' }),
      SamaAccessEvent.countDocuments({ societyId, exceptionStatus: { $in: ['UNMATCHED_DEVICE', 'UNKNOWN_EVENT'] } }),
      samaSourceService.getHealthBySociety(societyId),
    ]);
    return {
      staffCount,
      categoryCount,
      activeAssociationCount,
      providerCount,
      suspendedStaffCount,
      terminatedStaffCount,
      workOrders: workOrders.reduce((acc: Record<string, number>, item: any) => ({ ...acc, [item._id]: item.count }), {}),
      slaBreachedCount: workOrders.reduce((sum: number, item: any) => sum + Number(item.slaBreached || 0), 0),
      householdDuePaise: Number(householdTotals[0]?.due || 0),
      householdPaidPaise: Number(householdTotals[0]?.paid || 0),
      householdOutstandingPaise: Number(householdTotals[0]?.due || 0) - Number(householdTotals[0]?.paid || 0),
      unresolvedAccessExceptionCount,
      syncOverallStatus: syncHealth.overallStatus,
      staleSyncTypes: syncHealth.staleSyncTypes || [],
    };
  }

  async getStaffReport(societyId: string) {
    const [statusBreakdown, categoryBreakdown, lifecycleBreakdown] = await Promise.all([
      StaffProfile.aggregate([{ $match: { societyId: objectId(societyId) } }, { $group: { _id: '$accessStatus', count: { $sum: 1 } } }]),
      StaffProfile.aggregate([{ $match: { societyId: objectId(societyId) } }, { $group: { _id: { $ifNull: ['$primaryCategory', 'UNASSIGNED'] }, count: { $sum: 1 } } }, { $sort: { count: -1 } }]),
      StaffProfile.aggregate([{ $match: { societyId: objectId(societyId) } }, { $group: { _id: '$lifecycleStatus', count: { $sum: 1 } } }]),
    ]);
    return {
      statusBreakdown: statusBreakdown.map((item: any) => ({ status: item._id, count: item.count })),
      categoryBreakdown: categoryBreakdown.map((item: any) => ({ category: item._id, count: item.count })),
      lifecycleBreakdown: lifecycleBreakdown.map((item: any) => ({ status: item._id, count: item.count })),
    };
  }

  async getProviderReport(societyId: string) {
    const providers = await ServiceProviderProfile.find({ societyId }).lean();
    const metrics = await WorkOrder.aggregate([{ $match: { societyId: objectId(societyId), assignedServiceProviderId: { $ne: null } } }, { $group: { _id: '$assignedServiceProviderId', totalAssigned: { $sum: 1 }, completedCount: { $sum: { $cond: [{ $eq: ['$status', 'COMPLETED'] }, 1, 0] } }, cancelledCount: { $sum: { $cond: [{ $eq: ['$status', 'CANCELLED'] }, 1, 0] } }, escalatedCount: { $sum: { $cond: [{ $gt: ['$escalationLevel', 0] }, 1, 0] } }, slaBreachedCount: { $sum: { $cond: ['$slaBreached', 1, 0] } }, averageRating: { $avg: '$residentRating' } } }]);
    const map = new Map(metrics.map((item: any) => [item._id.toString(), item]));
    return providers.map((item) => {
      const metric = map.get(item._id!.toString());
      return { providerCode: item.providerCode, displayName: item.displayName, status: item.status, totalAssigned: Number(metric?.totalAssigned || 0), completedCount: Number(metric?.completedCount || 0), cancelledCount: Number(metric?.cancelledCount || 0), escalatedCount: Number(metric?.escalatedCount || 0), slaBreachedCount: Number(metric?.slaBreachedCount || 0), averageRating: metric?.averageRating ? Number(metric.averageRating.toFixed(2)) : null };
    });
  }

  async getHouseholdPaymentReport(societyId: string, query: { flatId?: string; billingMonth?: string }) {
    const filter: Record<string, unknown> = { societyId };
    if (query.flatId) filter.flatId = query.flatId;
    if (query.billingMonth) filter.billingMonth = query.billingMonth;
    const items = await HouseholdPaymentRecord.find(filter).sort({ billingMonth: -1, createdAt: -1 }).lean();
    return { items, totalDuePaise: items.reduce((sum, item) => sum + item.duePaise, 0), totalPaidPaise: items.reduce((sum, item) => sum + item.paidPaise, 0), outstandingPaise: items.reduce((sum, item) => sum + Math.max(item.duePaise - item.paidPaise, 0), 0) };
  }

  async getWorkOrderReport(societyId: string, query: { flatId?: string; status?: string; assignedServiceProviderId?: string; escalatedOnly?: boolean }) {
    const filter: Record<string, unknown> = { societyId };
    if (query.flatId) filter.flatId = query.flatId;
    if (query.status) filter.status = query.status;
    if (query.assignedServiceProviderId) filter.assignedServiceProviderId = query.assignedServiceProviderId;
    if (query.escalatedOnly) filter.escalationLevel = { $gt: 0 };
    const items = await WorkOrder.find(filter).sort({ createdAt: -1 }).lean();
    return { items, totalCount: items.length, escalatedCount: items.filter((item) => Number(item.escalationLevel || 0) > 0).length, cancelledCount: items.filter((item) => item.status === 'CANCELLED').length, slaBreachedCount: items.filter((item) => item.slaBreached).length };
  }

  async getSyncHealthReport(societyId: string) {
    return samaSourceService.getHealthBySociety(societyId);
  }

  async getAccessExceptionReport(societyId: string, query: { exceptionStatus?: string }) {
    const filter: Record<string, unknown> = { societyId, exceptionStatus: query.exceptionStatus || { $in: ['UNMATCHED_DEVICE', 'UNKNOWN_EVENT', 'RESOLVED', 'IGNORED'] } };
    const items = await SamaAccessEvent.find(filter).sort({ occurredAt: -1 }).lean();
    const summary = items.reduce((acc: Record<string, number>, item) => ({ ...acc, [item.exceptionStatus]: (acc[item.exceptionStatus] || 0) + 1 }), {});
    return { items, summary };
  }

  async exportReport(societyId: string, reportType: 'STAFF' | 'PROVIDERS' | 'HOUSEHOLD_PAYMENTS' | 'WORK_ORDERS' | 'SYNC_HEALTH' | 'ACCESS_EXCEPTIONS', query: Record<string, unknown>) {
    const rows = reportType === 'STAFF'
      ? (await this.getStaffReport(societyId)).categoryBreakdown
      : reportType === 'PROVIDERS'
        ? await this.getProviderReport(societyId)
        : reportType === 'HOUSEHOLD_PAYMENTS'
          ? (await this.getHouseholdPaymentReport(societyId, query as any)).items.map((item) => ({ billingMonth: item.billingMonth, duePaise: item.duePaise, paidPaise: item.paidPaise, status: item.status, receiptRef: item.receiptRef || '' }))
          : reportType === 'WORK_ORDERS'
            ? (await this.getWorkOrderReport(societyId, query as any)).items.map((item) => ({ workOrderCode: item.workOrderCode, title: item.title, status: item.status, escalationLevel: item.escalationLevel || 0, slaBreached: item.slaBreached ? 'YES' : 'NO' }))
            : reportType === 'SYNC_HEALTH'
              ? (await this.getSyncHealthReport(societyId)).syncChecks || []
              : (await this.getAccessExceptionReport(societyId, query as any)).items.map((item) => ({ externalEventId: item.externalEventId, externalDeviceId: item.externalDeviceId, exceptionStatus: item.exceptionStatus, exceptionReason: item.exceptionReason || '', occurredAt: item.occurredAt }));
    return { format: 'CSV', fileName: `sama-${reportType.toLowerCase()}-${new Date().toISOString().slice(0, 10)}.csv`, content: toCsv(rows as Record<string, unknown>[]) };
  }
}

export const samaReportService = new SamaReportService();
