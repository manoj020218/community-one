import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Home, Wallet, CalendarClock, ShieldCheck, Plus, FileText } from 'lucide-react';
import { api, extractData } from '../../services/api';
import { PageHeader } from '../../components/common/PageHeader';
import { EmptyState } from '../../components/common/EmptyState';
import { TableSkeleton } from '../../components/common/LoadingSkeleton';
import { StatCard } from '../../components/common/StatCard';
import { useAuthStore } from '../../store/authStore';
import { useSocietyStore } from '../../store/societyStore';
import { Lease } from '../../types';
import { formatCurrency, formatDate, cn } from '../../utils/cn';
import { LeaseFormModal } from './LeaseFormModal';
import { LeasePaymentModal } from './LeasePaymentModal';
import { LeaseLifecycleModal } from './LeaseLifecycleModal';

const statusColors: Record<string, string> = {
  ACTIVE: 'badge-green', EXPIRED: 'badge-gray', TERMINATED: 'badge-red', RENEWED: 'badge-blue',
};

const DAY_MS = 24 * 60 * 60 * 1000;

export function LeasePage() {
  const { user } = useAuthStore();
  const { currentSociety } = useSocietyStore();
  const societyId = currentSociety?._id || user?.societyId || '';

  const [showForm, setShowForm] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [paymentLease, setPaymentLease] = useState<Lease | null>(null);
  const [lifecycle, setLifecycle] = useState<{ lease: Lease; mode: 'renew' | 'terminate' } | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['leases', societyId, statusFilter],
    queryFn: () => extractData<any>(api.get(`/leases/society/${societyId}?limit=100${statusFilter ? `&status=${statusFilter}` : ''}`)),
    enabled: !!societyId,
  });

  const leases: Lease[] = data?.items || [];

  const stats = useMemo(() => {
    const active = leases.filter((l) => l.status === 'ACTIVE');
    const now = Date.now();
    const expiringSoon = active.filter((l) => new Date(l.endDate).getTime() - now <= 30 * DAY_MS);
    return {
      activeCount: active.length,
      monthlyRentRoll: active.reduce((sum, l) => sum + l.rentAmount, 0),
      expiringSoonCount: expiringSoon.length,
      depositsHeld: active.reduce((sum, l) => sum + (l.depositAmount || 0), 0),
    };
  }, [leases]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Rent & Lease Management"
        subtitle="Track tenancies, rent collection and security deposits"
        action={<button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-2"><Plus className="w-4 h-4" /> New Lease</button>}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Active Leases" value={stats.activeCount} icon={Home} color="blue" />
        <StatCard title="Monthly Rent Roll" value={formatCurrency(stats.monthlyRentRoll)} icon={Wallet} color="green" />
        <StatCard title="Expiring in 30 Days" value={stats.expiringSoonCount} icon={CalendarClock} color="amber" />
        <StatCard title="Deposits Held" value={formatCurrency(stats.depositsHeld)} icon={ShieldCheck} color="purple" />
      </div>

      <div className="card p-4 flex items-center gap-3 flex-wrap">
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="input w-auto min-w-[160px] py-2 text-sm">
          <option value="">All Statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="EXPIRED">Expired</option>
          <option value="TERMINATED">Terminated</option>
          <option value="RENEWED">Renewed</option>
        </select>
        <span className="ml-auto text-xs text-slate-500">{data?.total ?? 0} leases total</span>
      </div>

      {isLoading ? (
        <TableSkeleton rows={6} cols={6} />
      ) : leases.length === 0 ? (
        <div className="card overflow-hidden">
          <EmptyState icon={FileText} title="No leases yet" description="Create a lease to start tracking a tenancy and its rent"
            action={<button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-2"><Plus className="w-4 h-4" /> New Lease</button>} />
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="table-header text-left">Tenant</th>
                  <th className="table-header text-left">Flat / Room</th>
                  <th className="table-header text-left">Rent</th>
                  <th className="table-header text-left">Deposit</th>
                  <th className="table-header text-left">Term</th>
                  <th className="table-header text-left">Status</th>
                  <th className="table-header text-left">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {leases.map((l) => (
                  <tr key={l._id} className="table-row">
                    <td className="table-cell font-medium text-slate-800 text-sm">{(l.residentId as any)?.name || '—'}</td>
                    <td className="table-cell font-mono text-sm text-slate-600">{(l.flatId as any)?.flatNo || '—'}</td>
                    <td className="table-cell font-semibold text-slate-900">{formatCurrency(l.rentAmount)}</td>
                    <td className="table-cell text-slate-600">{formatCurrency(l.depositAmount || 0)}</td>
                    <td className="table-cell text-xs text-slate-500">{formatDate(l.startDate)} – {formatDate(l.endDate)}</td>
                    <td className="table-cell"><span className={cn('badge text-xs', statusColors[l.status] || 'badge-gray')}>{l.status}</span></td>
                    <td className="table-cell">
                      <div className="flex items-center gap-1 flex-wrap">
                        {l.status === 'ACTIVE' && (
                          <>
                            <button onClick={() => setPaymentLease(l)} className="text-xs px-2 py-1 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100">Record Payment</button>
                            <button onClick={() => setLifecycle({ lease: l, mode: 'renew' })} className="text-xs px-2 py-1 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100">Renew</button>
                            <button onClick={() => setLifecycle({ lease: l, mode: 'terminate' })} className="text-xs px-2 py-1 rounded-lg bg-red-50 text-red-700 hover:bg-red-100">Terminate</button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <LeaseFormModal isOpen={showForm} onClose={() => setShowForm(false)} societyId={societyId} createdBy={user?._id || ''} />
      <LeasePaymentModal lease={paymentLease} societyId={societyId} onClose={() => setPaymentLease(null)} />
      <LeaseLifecycleModal lease={lifecycle?.lease || null} mode={lifecycle?.mode || null} onClose={() => setLifecycle(null)} />
    </div>
  );
}
