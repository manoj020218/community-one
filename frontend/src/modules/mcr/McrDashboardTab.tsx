import { useQuery } from '@tanstack/react-query';
import { Banknote, TrendingUp, AlertTriangle, Receipt, Clock, Percent } from 'lucide-react';
import { api, extractData } from '../../services/api';
import { StatCard } from '../../components/common/StatCard';
import { CardSkeleton } from '../../components/common/LoadingSkeleton';
import { useAuthStore } from '../../store/authStore';
import { useSocietyStore } from '../../store/societyStore';
import { formatPaise, McrReportSummary } from './mcr.types';
import { hasMcrAdminAccess } from './mcr.permissions';

export function McrDashboardTab() {
  const { user } = useAuthStore();
  const { currentSociety } = useSocietyStore();
  const societyId = currentSociety?._id || user?.societyId || '';
  const permissions = user?.permissions || [];
  const isAdminView = hasMcrAdminAccess(permissions);
  const flatId = !isAdminView ? user?.flatId : undefined;

  const { data: summary, isLoading } = useQuery({
    queryKey: ['mcr-summary', societyId, flatId],
    queryFn: () => extractData<McrReportSummary>(api.get('/mcr/reports/summary', { params: { societyId, ...(flatId ? { flatId } : {}) } })),
    enabled: !!societyId,
  });

  if (isLoading) return <CardSkeleton count={6} />;

  const collectionPercent = summary && summary.totalDemandPaise > 0
    ? Math.round((summary.paidPaise / summary.totalDemandPaise) * 100)
    : 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard title="Total Billed" value={formatPaise(summary?.totalDemandPaise)} icon={Banknote} color="indigo" />
        <StatCard title="Total Collected" value={formatPaise(summary?.collectedPaise)} icon={TrendingUp} color="green" />
        <StatCard title="Outstanding" value={formatPaise(summary?.outstandingPaise)} icon={Clock} color="amber" />
        <StatCard title="Overdue" value={formatPaise(summary?.overduePaise)} icon={AlertTriangle} color="red" />
        <StatCard title="Collection Rate" value={`${collectionPercent}%`} icon={Percent} color="blue" />
        <StatCard title="Receipts Issued" value={summary?.issuedReceiptCount ?? 0} icon={Receipt} color="purple" />
      </div>

      <div className="card p-6">
        <h3 className="section-title mb-4">Advance & Demand Summary</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
          <div><p className="text-slate-500">Demands</p><p className="font-semibold text-slate-800">{summary?.demandCount ?? 0}</p></div>
          <div><p className="text-slate-500">Collections</p><p className="font-semibold text-slate-800">{summary?.collectionCount ?? 0}</p></div>
          <div><p className="text-slate-500">Advance Created</p><p className="font-semibold text-slate-800">{formatPaise(summary?.advanceCreatedPaise)}</p></div>
          <div><p className="text-slate-500">Advance Balance</p><p className="font-semibold text-slate-800">{formatPaise(summary?.advanceBalancePaise)}</p></div>
        </div>
      </div>
    </div>
  );
}
