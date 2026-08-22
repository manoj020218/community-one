import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Banknote, TrendingUp, AlertTriangle, Receipt, Clock, Percent, Wallet, Landmark, PiggyBank } from 'lucide-react';
import { api, extractData } from '../../services/api';
import { StatCard } from '../../components/common/StatCard';
import { CardSkeleton } from '../../components/common/LoadingSkeleton';
import { useAuthStore } from '../../store/authStore';
import { useSocietyStore } from '../../store/societyStore';
import { formatPaise, McrFundBalance, McrReportSummary, McrTowerSummary } from './mcr.types';
import { hasMcrAdminAccess, hasMcrExpenseAccess } from './mcr.permissions';
import { OpeningBalanceEmptyState, OpeningBalanceWizard } from './OpeningBalanceWizard';

export function McrDashboardTab() {
  const { user } = useAuthStore();
  const { currentSociety } = useSocietyStore();
  const societyId = currentSociety?._id || user?.societyId || '';
  const permissions = user?.permissions || [];
  const isAdminView = hasMcrAdminAccess(permissions);
  const canSeeFundBalance = hasMcrExpenseAccess(permissions);
  const flatId = !isAdminView ? user?.flatId : undefined;
  const [showWizard, setShowWizard] = useState(false);

  const { data: fundBalance } = useQuery({
    queryKey: ['mcr-fund-balance', societyId],
    queryFn: () => extractData<McrFundBalance>(api.get('/mcr/reports/fund-balance', { params: { societyId } })),
    enabled: !!societyId && canSeeFundBalance,
  });

  const { data: summary, isLoading } = useQuery({
    queryKey: ['mcr-summary', societyId, flatId],
    queryFn: () => extractData<McrReportSummary>(api.get('/mcr/reports/summary', { params: { societyId, ...(flatId ? { flatId } : {}) } })),
    enabled: !!societyId,
  });

  // Block-wise breakdown only makes sense for the admin's society-wide view, not a single
  // resident's own flat statement.
  const { data: towerSummaries } = useQuery({
    queryKey: ['mcr-summary-by-tower', societyId],
    queryFn: () => extractData<McrTowerSummary[]>(api.get('/mcr/reports/summary-by-tower', { params: { societyId } })),
    enabled: !!societyId && isAdminView,
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

      {canSeeFundBalance && fundBalance && !fundBalance.hasOpeningBalance && (
        <OpeningBalanceEmptyState onSetup={() => setShowWizard(true)} />
      )}

      {canSeeFundBalance && fundBalance?.hasOpeningBalance && (
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="section-title">Fund Balance</h3>
            <span className="text-xs text-slate-400">as of {new Date().toLocaleDateString('en-IN')}</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-100">
              <div className="flex items-center gap-2 text-emerald-700 mb-1"><Wallet className="w-4 h-4" /><span className="text-xs font-medium">Cash in Hand</span></div>
              <p className="text-xl font-bold text-emerald-800">{formatPaise(fundBalance.cashBalancePaise)}</p>
            </div>
            <div className="p-4 rounded-2xl bg-blue-50 border border-blue-100">
              <div className="flex items-center gap-2 text-blue-700 mb-1"><Landmark className="w-4 h-4" /><span className="text-xs font-medium">Bank Balance</span></div>
              <p className="text-xl font-bold text-blue-800">{formatPaise(fundBalance.bankBalancePaise)}</p>
            </div>
            <div className="p-4 rounded-2xl bg-indigo-50 border border-indigo-100">
              <div className="flex items-center gap-2 text-indigo-700 mb-1"><PiggyBank className="w-4 h-4" /><span className="text-xs font-medium">Total Balance</span></div>
              <p className="text-xl font-bold text-indigo-800">{formatPaise(fundBalance.totalBalancePaise)}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm mt-4 pt-4 border-t border-slate-100">
            <div><p className="text-slate-500">This Month's Income</p><p className="font-semibold text-emerald-600">{formatPaise(fundBalance.currentMonthIncomePaise)}</p></div>
            <div><p className="text-slate-500">This Month's Expense</p><p className="font-semibold text-red-600">{formatPaise(fundBalance.currentMonthExpensePaise)}</p></div>
          </div>
        </div>
      )}

      <OpeningBalanceWizard isOpen={showWizard} onClose={() => setShowWizard(false)} />

      <div className="card p-6">
        <h3 className="section-title mb-4">Advance & Demand Summary</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
          <div><p className="text-slate-500">Demands</p><p className="font-semibold text-slate-800">{summary?.demandCount ?? 0}</p></div>
          <div><p className="text-slate-500">Collections</p><p className="font-semibold text-slate-800">{summary?.collectionCount ?? 0}</p></div>
          <div><p className="text-slate-500">Advance Created</p><p className="font-semibold text-slate-800">{formatPaise(summary?.advanceCreatedPaise)}</p></div>
          <div><p className="text-slate-500">Advance Balance</p><p className="font-semibold text-slate-800">{formatPaise(summary?.advanceBalancePaise)}</p></div>
        </div>
      </div>

      {(towerSummaries?.length || 0) > 1 && (
        <div className="card">
          <div className="px-6 py-4 border-b border-slate-100">
            <h3 className="section-title">Block-wise Billing</h3>
          </div>
          <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {towerSummaries!.map((t) => {
              const pct = t.totalDemandPaise > 0 ? Math.round((t.paidPaise / t.totalDemandPaise) * 100) : 0;
              return (
                <div key={t.towerId} className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-slate-800 truncate">{t.towerName}</span>
                    <span className="text-xs font-medium text-slate-400">{pct}% collected</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div><p className="text-slate-500">Billed</p><p className="font-semibold text-slate-800">{formatPaise(t.totalDemandPaise)}</p></div>
                    <div><p className="text-slate-500">Collected</p><p className="font-semibold text-emerald-600">{formatPaise(t.paidPaise)}</p></div>
                    <div><p className="text-slate-500">Outstanding</p><p className="font-semibold text-amber-600">{formatPaise(t.outstandingPaise)}</p></div>
                    <div><p className="text-slate-500">Overdue</p><p className="font-semibold text-red-600">{formatPaise(t.overduePaise)}</p></div>
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-400 pt-1 border-t border-slate-200">
                    <span>{t.demandCount} demands</span>
                    <span>{t.issuedReceiptCount} receipts</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
