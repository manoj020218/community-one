import { useQuery } from '@tanstack/react-query';
import { Users, Briefcase, Home, AlertTriangle, Wallet, ClipboardList } from 'lucide-react';
import { api, extractData } from '../../services/api';
import { StatCard } from '../../components/common/StatCard';
import { CardSkeleton } from '../../components/common/LoadingSkeleton';
import { useAuthStore } from '../../store/authStore';
import { useSocietyStore } from '../../store/societyStore';
import { formatPaise, SamaDashboard } from './sama.types';

export function SamaDashboardTab() {
  const { user } = useAuthStore();
  const { currentSociety } = useSocietyStore();
  const societyId = currentSociety?._id || user?.societyId || '';

  const { data, isLoading } = useQuery({
    queryKey: ['sama-dashboard', societyId],
    queryFn: () => extractData<SamaDashboard>(api.get('/sama/dashboard', { params: { societyId } })),
    enabled: !!societyId,
  });

  if (isLoading) return <CardSkeleton count={6} />;

  const openWorkOrders = (data?.workOrders?.OPEN || 0) + (data?.workOrders?.ASSIGNED || 0) + (data?.workOrders?.IN_PROGRESS || 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard title="Total Staff" value={data?.staffCount ?? 0} icon={Users} color="indigo" />
        <StatCard title="Active Household Associations" value={data?.activeAssociationCount ?? 0} icon={Home} color="green" />
        <StatCard title="Service Providers" value={data?.providerCount ?? 0} icon={Briefcase} color="blue" />
        <StatCard title="Open Work Orders" value={openWorkOrders} icon={ClipboardList} color="amber" />
        <StatCard title="SLA Breaches" value={data?.slaBreachedCount ?? 0} icon={AlertTriangle} color="red" />
        <StatCard title="Household Outstanding" value={formatPaise(data?.householdOutstandingPaise)} icon={Wallet} color="purple" />
      </div>

      <div className="card p-6">
        <h3 className="section-title mb-4">Work Orders by Status</h3>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 text-sm">
          {Object.entries(data?.workOrders || {}).map(([status, count]) => (
            <div key={status}><p className="text-slate-500">{status.replace('_', ' ')}</p><p className="font-semibold text-slate-800">{count}</p></div>
          ))}
        </div>
      </div>

      <div className="card p-6">
        <h3 className="section-title mb-4">Household Payments</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
          <div><p className="text-slate-500">Due</p><p className="font-semibold text-slate-800">{formatPaise(data?.householdDuePaise)}</p></div>
          <div><p className="text-slate-500">Paid</p><p className="font-semibold text-slate-800">{formatPaise(data?.householdPaidPaise)}</p></div>
          <div><p className="text-slate-500">Outstanding</p><p className="font-semibold text-slate-800">{formatPaise(data?.householdOutstandingPaise)}</p></div>
        </div>
      </div>
    </div>
  );
}
