import { useQuery } from '@tanstack/react-query';
import { Download, FileBarChart, Star } from 'lucide-react';
import { api, extractData } from '../../services/api';
import { EmptyState } from '../../components/common/EmptyState';
import { TableSkeleton } from '../../components/common/LoadingSkeleton';
import { useAuthStore } from '../../store/authStore';
import { useSocietyStore } from '../../store/societyStore';
import { downloadCsv, formatPaise, SamaHouseholdPaymentReport, SamaProviderReport, SamaStaffReport } from './sama.types';

async function exportReport(api: any, societyId: string, reportType: 'STAFF' | 'PROVIDERS' | 'HOUSEHOLD_PAYMENTS') {
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
    </div>
  );
}
