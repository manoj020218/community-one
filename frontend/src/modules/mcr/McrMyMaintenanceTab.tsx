import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Wallet, FileText, Receipt as ReceiptIcon, Download, CreditCard } from 'lucide-react';
import toast from 'react-hot-toast';
import { api, extractData } from '../../services/api';
import { EmptyState } from '../../components/common/EmptyState';
import { TableSkeleton } from '../../components/common/LoadingSkeleton';
import { StatCard } from '../../components/common/StatCard';
import { useAuthStore } from '../../store/authStore';
import { useSocietyStore } from '../../store/societyStore';
import { cn, formatDate } from '../../utils/cn';
import { DEMAND_STATUS_BADGE, formatPaise, McrStatement, openMcrDocument } from './mcr.types';

export function McrMyMaintenanceTab() {
  const { user } = useAuthStore();
  const { currentSociety } = useSocietyStore();
  const societyId = currentSociety?._id || user?.societyId || '';
  const flatId = user?.flatId || '';
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['mcr-statement', societyId, flatId],
    queryFn: () => extractData<McrStatement>(api.get('/mcr/reports/statement', { params: { societyId, flatId } })),
    enabled: !!societyId && !!flatId,
  });

  const payNowMutation = useMutation({
    mutationFn: () => extractData<{ paymentId: string; status: string }>(api.post('/mcr/gateway/orders', { societyId, flatId })),
    onSuccess: (order) => {
      toast.success(`Payment order created (status: ${order.status}). Your verifier will confirm shortly.`);
      queryClient.invalidateQueries({ queryKey: ['mcr-statement'] });
    },
  });

  if (!flatId) {
    return <EmptyState icon={Wallet} title="No flat linked" description="Your account is not linked to a flat, so maintenance details are unavailable." />;
  }

  if (isLoading) return <TableSkeleton rows={4} cols={4} />;

  const outstandingDemands = (data?.demands || []).filter((d) => d.status === 'PUBLISHED' || d.status === 'PARTIALLY_PAID' || d.status === 'OVERDUE');
  const nextDue = outstandingDemands.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())[0];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard title="Outstanding" value={formatPaise(data?.summary.outstandingPaise)} icon={Wallet} color="amber" />
        <StatCard title="Next Due Date" value={nextDue ? formatDate(nextDue.dueDate) : '—'} icon={FileText} color="blue" />
        <StatCard title="Receipts" value={data?.summary.issuedReceiptCount ?? 0} icon={ReceiptIcon} color="green" />
      </div>

      {(data?.summary.outstandingPaise || 0) > 0 && (
        <button onClick={() => payNowMutation.mutate()} disabled={payNowMutation.isPending} className="btn-primary flex items-center gap-2">
          <CreditCard className="w-4 h-4" /> {payNowMutation.isPending ? 'Starting payment...' : 'Pay Now'}
        </button>
      )}

      <div className="card overflow-hidden">
        <div className="p-4 border-b border-slate-100"><h3 className="section-title">Maintenance Demands</h3></div>
        {!data?.demands?.length ? (
          <EmptyState icon={FileText} title="No demands yet" description="Maintenance demands for your flat will appear here once published." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr>
                <th className="table-header text-left">Period</th>
                <th className="table-header text-left">Due Date</th>
                <th className="table-header text-left">Total</th>
                <th className="table-header text-left">Outstanding</th>
                <th className="table-header text-left">Status</th>
              </tr></thead>
              <tbody>
                {data.demands.map((demand) => (
                  <tr key={demand._id} className="table-row">
                    <td className="table-cell font-medium text-slate-800">{demand.billingPeriodLabel}</td>
                    <td className="table-cell text-xs text-slate-500">{formatDate(demand.dueDate)}</td>
                    <td className="table-cell">{formatPaise(demand.totalDemandPaise)}</td>
                    <td className="table-cell font-semibold">{formatPaise(demand.outstandingPaise)}</td>
                    <td className="table-cell"><span className={cn('badge', DEMAND_STATUS_BADGE[demand.status])}>{demand.status.replace('_', ' ')}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="card overflow-hidden">
        <div className="p-4 border-b border-slate-100"><h3 className="section-title">Receipts</h3></div>
        {!data?.receipts?.length ? (
          <EmptyState icon={ReceiptIcon} title="No receipts yet" description="Receipts for verified payments will appear here." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr>
                <th className="table-header text-left">Receipt #</th>
                <th className="table-header text-left">Date</th>
                <th className="table-header text-left">Amount</th>
                <th className="table-header text-left">Status</th>
                <th className="table-header text-left">Action</th>
              </tr></thead>
              <tbody>
                {data.receipts.map((receipt) => (
                  <tr key={receipt._id} className="table-row">
                    <td className="table-cell font-medium text-slate-800">{receipt.receiptNumber}</td>
                    <td className="table-cell text-xs text-slate-500">{formatDate(receipt.issuedAt)}</td>
                    <td className="table-cell">{formatPaise(receipt.amountPaise)}</td>
                    <td className="table-cell"><span className="badge badge-green">{receipt.status}</span></td>
                    <td className="table-cell">
                      <button
                        onClick={() => openMcrDocument(api, `/mcr/receipts/${receipt._id}/download?societyId=${societyId}`)}
                        className="text-primary-600 hover:text-primary-700 flex items-center gap-1 text-xs font-medium"
                      >
                        <Download className="w-3.5 h-3.5" /> Download
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
