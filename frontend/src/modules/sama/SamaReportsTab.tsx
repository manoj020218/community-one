import { useQuery } from '@tanstack/react-query';
import { Download, FileBarChart, Star, ClipboardList, Activity, AlertOctagon } from 'lucide-react';
import { api, extractData } from '../../services/api';
import { EmptyState } from '../../components/common/EmptyState';
import { TableSkeleton } from '../../components/common/LoadingSkeleton';
import { useAuthStore } from '../../store/authStore';
import { useSocietyStore } from '../../store/societyStore';
import { cn, formatDate } from '../../utils/cn';
import {
  EXCEPTION_STATUS_BADGE, SamaAccessExceptionReport, SamaHouseholdPaymentReport, SamaProviderReport,
  SamaStaffReport, SamaSyncHealth, SamaWorkOrderReport, WORK_ORDER_STATUS_BADGE, downloadCsv, formatPaise,
} from './sama.types';

const HEALTH_BADGE: Record<string, string> = { OK: 'badge-green', ATTENTION: 'badge-red', NOT_CONFIGURED: 'badge-gray' };

async function exportReport(api: any, societyId: string, reportType: 'STAFF' | 'PROVIDERS' | 'HOUSEHOLD_PAYMENTS' | 'WORK_ORDERS' | 'SYNC_HEALTH' | 'ACCESS_EXCEPTIONS') {
  const result = await extractData<{ fileName: string; content: string }>(
    api.get('/sama/reports/export', { params: { societyId, reportType, format: 'CSV' } })
  );
  downloadCsv(result.fileName, result.content);
}

export function SamaReportsTab() {
  const { user } = useAuthStore();
  const { currentSociety } = useSocietyStore();
  const societyId = currentSociety?._id || user?.societyId || '';

  const { data: staffReport, isLoading: loadingStaff } = useQuery({
    queryKey: ['sama-report-staff', societyId],
    queryFn: () => extractData<SamaStaffReport>(api.get('/sama/reports/staff', { params: { societyId } })),
    enabled: !!societyId,
  });

  const { data: providerReport, isLoading: loadingProviders } = useQuery({
    queryKey: ['sama-report-providers', societyId],
    queryFn: () => extractData<SamaProviderReport[]>(api.get('/sama/reports/providers', { params: { societyId } })),
    enabled: !!societyId,
  });

  const { data: paymentReport, isLoading: loadingPayments } = useQuery({
    queryKey: ['sama-report-payments', societyId],
    queryFn: () => extractData<SamaHouseholdPaymentReport>(api.get('/sama/reports/household-payments', { params: { societyId } })),
    enabled: !!societyId,
  });

  const { data: workOrderReport, isLoading: loadingWorkOrders } = useQuery({
    queryKey: ['sama-report-work-orders', societyId],
    queryFn: () => extractData<SamaWorkOrderReport>(api.get('/sama/reports/work-orders', { params: { societyId } })),
    enabled: !!societyId,
  });

  const { data: syncHealthReport, isLoading: loadingSyncHealth } = useQuery({
    queryKey: ['sama-report-sync-health', societyId],
    queryFn: () => extractData<SamaSyncHealth>(api.get('/sama/reports/sync-health', { params: { societyId } })),
    enabled: !!societyId,
  });

  const { data: exceptionReport, isLoading: loadingExceptions } = useQuery({
    queryKey: ['sama-report-access-exceptions', societyId],
    queryFn: () => extractData<SamaAccessExceptionReport>(api.get('/sama/reports/access-exceptions', { params: { societyId } })),
    enabled: !!societyId,
  });

  return (
    <div className="space-y-6">
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="section-title">Staff Report</h3>
          <button onClick={() => exportReport(api, societyId, 'STAFF')} className="btn-secondary flex items-center gap-2 text-sm"><Download className="w-4 h-4" /> Export CSV</button>
        </div>
        {loadingStaff ? <TableSkeleton rows={3} cols={2} /> : !staffReport?.categoryBreakdown?.length ? (
          <EmptyState icon={FileBarChart} title="No staff data yet" description="Add staff to see status and category breakdowns." />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase mb-2">By Status</p>
              {staffReport.statusBreakdown.map((s) => <div key={s.status} className="flex justify-between text-sm py-1 border-b border-slate-50"><span>{s.status}</span><span className="font-semibold">{s.count}</span></div>)}
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase mb-2">By Category</p>
              {staffReport.categoryBreakdown.map((c) => <div key={c.category} className="flex justify-between text-sm py-1 border-b border-slate-50"><span>{c.category}</span><span className="font-semibold">{c.count}</span></div>)}
            </div>
          </div>
        )}
      </div>

      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="section-title">Provider Performance</h3>
          <button onClick={() => exportReport(api, societyId, 'PROVIDERS')} className="btn-secondary flex items-center gap-2 text-sm"><Download className="w-4 h-4" /> Export CSV</button>
        </div>
        {loadingProviders ? <TableSkeleton rows={3} cols={5} /> : !providerReport?.length ? (
          <EmptyState icon={Star} title="No providers yet" description="Add service providers to see performance metrics." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr><th className="table-header text-left">Provider</th><th className="table-header text-left">Assigned</th><th className="table-header text-left">Completed</th><th className="table-header text-left">SLA Breaches</th><th className="table-header text-left">Avg Rating</th></tr></thead>
              <tbody>
                {providerReport.map((p) => (
                  <tr key={p.providerCode} className="table-row">
                    <td className="table-cell font-medium text-slate-800">{p.displayName}</td>
                    <td className="table-cell">{p.totalAssigned}</td>
                    <td className="table-cell">{p.completedCount}</td>
                    <td className="table-cell">{p.slaBreachedCount}</td>
                    <td className="table-cell">{p.averageRating ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="section-title">Household Payments</h3>
          <button onClick={() => exportReport(api, societyId, 'HOUSEHOLD_PAYMENTS')} className="btn-secondary flex items-center gap-2 text-sm"><Download className="w-4 h-4" /> Export CSV</button>
        </div>
        {loadingPayments ? <TableSkeleton rows={3} cols={3} /> : (
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div><p className="text-slate-500">Total Due</p><p className="font-semibold text-slate-800">{formatPaise(paymentReport?.totalDuePaise)}</p></div>
            <div><p className="text-slate-500">Total Paid</p><p className="font-semibold text-slate-800">{formatPaise(paymentReport?.totalPaidPaise)}</p></div>
            <div><p className="text-slate-500">Outstanding</p><p className="font-semibold text-slate-800">{formatPaise(paymentReport?.outstandingPaise)}</p></div>
          </div>
        )}
      </div>

      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="section-title flex items-center gap-2"><ClipboardList className="w-4 h-4 text-slate-400" /> Work Orders</h3>
          <button onClick={() => exportReport(api, societyId, 'WORK_ORDERS')} className="btn-secondary flex items-center gap-2 text-sm"><Download className="w-4 h-4" /> Export CSV</button>
        </div>
        {loadingWorkOrders ? <TableSkeleton rows={3} cols={4} /> : !workOrderReport?.items?.length ? (
          <EmptyState icon={ClipboardList} title="No work orders yet" description="Work-order stats will appear here once created." />
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
              <div><p className="text-slate-500">Total</p><p className="font-semibold text-slate-800">{workOrderReport.totalCount}</p></div>
              <div><p className="text-slate-500">Escalated</p><p className="font-semibold text-slate-800">{workOrderReport.escalatedCount}</p></div>
              <div><p className="text-slate-500">Cancelled</p><p className="font-semibold text-slate-800">{workOrderReport.cancelledCount}</p></div>
              <div><p className="text-slate-500">SLA Breached</p><p className="font-semibold text-slate-800">{workOrderReport.slaBreachedCount}</p></div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead><tr><th className="table-header text-left">Code</th><th className="table-header text-left">Title</th><th className="table-header text-left">Status</th></tr></thead>
                <tbody>
                  {workOrderReport.items.slice(0, 10).map((wo) => (
                    <tr key={wo._id} className="table-row">
                      <td className="table-cell font-mono text-xs">{wo.workOrderCode}</td>
                      <td className="table-cell text-sm">{wo.title}</td>
                      <td className="table-cell"><span className={cn('badge', WORK_ORDER_STATUS_BADGE[wo.status])}>{wo.status.replace(/_/g, ' ')}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="section-title flex items-center gap-2"><Activity className="w-4 h-4 text-slate-400" /> Sync Health</h3>
          <button onClick={() => exportReport(api, societyId, 'SYNC_HEALTH')} className="btn-secondary flex items-center gap-2 text-sm"><Download className="w-4 h-4" /> Export CSV</button>
        </div>
        {loadingSyncHealth ? <TableSkeleton rows={2} cols={3} /> : (
          <div className="flex items-center gap-4">
            <span className={cn('badge', HEALTH_BADGE[syncHealthReport?.overallStatus || 'NOT_CONFIGURED'])}>{(syncHealthReport?.overallStatus || 'NOT_CONFIGURED').replace(/_/g, ' ')}</span>
            {!!syncHealthReport?.staleSyncTypes?.length && <p className="text-xs text-amber-700">Stale: {syncHealthReport.staleSyncTypes.join(', ')}</p>}
          </div>
        )}
      </div>

      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="section-title flex items-center gap-2"><AlertOctagon className="w-4 h-4 text-slate-400" /> Access Exceptions</h3>
          <button onClick={() => exportReport(api, societyId, 'ACCESS_EXCEPTIONS')} className="btn-secondary flex items-center gap-2 text-sm"><Download className="w-4 h-4" /> Export CSV</button>
        </div>
        {loadingExceptions ? <TableSkeleton rows={3} cols={2} /> : !exceptionReport?.items?.length ? (
          <EmptyState icon={AlertOctagon} title="No access exceptions" description="Unmatched or unknown access events will be summarized here." />
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-4 text-sm">
              {Object.entries(exceptionReport.summary).map(([status, count]) => (
                <div key={status} className="flex items-center gap-2">
                  <span className={cn('badge', EXCEPTION_STATUS_BADGE[status as keyof typeof EXCEPTION_STATUS_BADGE] || 'badge-gray')}>{status.replace(/_/g, ' ')}</span>
                  <span className="font-semibold text-slate-800">{count}</span>
                </div>
              ))}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead><tr><th className="table-header text-left">Device</th><th className="table-header text-left">Status</th><th className="table-header text-left">Occurred</th></tr></thead>
                <tbody>
                  {exceptionReport.items.slice(0, 10).map((ev) => (
                    <tr key={ev._id} className="table-row">
                      <td className="table-cell text-xs text-slate-600">{ev.externalDeviceId}</td>
                      <td className="table-cell"><span className={cn('badge', EXCEPTION_STATUS_BADGE[ev.exceptionStatus])}>{ev.exceptionStatus.replace(/_/g, ' ')}</span></td>
                      <td className="table-cell text-xs text-slate-500">{formatDate(ev.occurredAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
