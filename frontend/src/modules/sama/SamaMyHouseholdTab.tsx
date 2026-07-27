import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Home, CheckCircle2, Receipt } from 'lucide-react';
import toast from 'react-hot-toast';
import { api, extractData } from '../../services/api';
import { EmptyState } from '../../components/common/EmptyState';
import { TableSkeleton } from '../../components/common/LoadingSkeleton';
import { useAuthStore } from '../../store/authStore';
import { useSocietyStore } from '../../store/societyStore';
import { cn } from '../../utils/cn';
import { ASSOCIATION_STATUS_BADGE, formatPaise, HOUSEHOLD_PAYMENT_STATUS_BADGE, HouseholdAssociation, HouseholdPaymentRecord, PaginatedResult } from './sama.types';

export function SamaMyHouseholdTab() {
  const { user } = useAuthStore();
  const { currentSociety } = useSocietyStore();
  const societyId = currentSociety?._id || user?.societyId || '';
  const queryClient = useQueryClient();

  const { data: associations, isLoading } = useQuery({
    queryKey: ['sama-my-associations', societyId],
    queryFn: () => extractData<PaginatedResult<HouseholdAssociation>>(api.get('/sama/household-associations', { params: { societyId, limit: 50 } })),
    enabled: !!societyId,
  });

  const { data: payments } = useQuery({
    queryKey: ['sama-my-payments', societyId],
    queryFn: () => extractData<PaginatedResult<HouseholdPaymentRecord>>(api.get('/sama/household-payments', { params: { societyId, limit: 50 } })),
    enabled: !!societyId,
  });

  const approveMutation = useMutation({
    mutationFn: (associationId: string) => api.post(`/sama/household-associations/${associationId}/approve-resident`, { societyId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sama-my-associations'] });
      toast.success('Association approved');
    },
  });

  if (isLoading) return <TableSkeleton rows={3} cols={4} />;

  return (
    <div className="space-y-6">
      <div className="card overflow-hidden">
        <div className="p-4 border-b border-slate-100"><h3 className="section-title">My Household Staff</h3></div>
        {!associations?.items?.length ? (
          <EmptyState icon={Home} title="No household staff linked" description="Household staff associations set up by the society admin for your flat will appear here for your approval." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr>
                <th className="table-header text-left">Services</th>
                <th className="table-header text-left">Monthly Rate</th>
                <th className="table-header text-left">Status</th>
                <th className="table-header text-left">Action</th>
              </tr></thead>
              <tbody>
                {associations.items.map((assoc) => (
                  <tr key={assoc._id} className="table-row">
                    <td className="table-cell text-sm text-slate-700">{assoc.services.join(', ')}</td>
                    <td className="table-cell">{assoc.monthlyRatePaise ? formatPaise(assoc.monthlyRatePaise) : '—'}</td>
                    <td className="table-cell"><span className={cn('badge', ASSOCIATION_STATUS_BADGE[assoc.status])}>{assoc.status.replace(/_/g, ' ')}</span></td>
                    <td className="table-cell">
                      {assoc.status === 'PENDING_RESIDENT_APPROVAL' && (
                        <button onClick={() => approveMutation.mutate(assoc._id)} disabled={approveMutation.isPending} className="text-emerald-600 hover:text-emerald-700 flex items-center gap-1 text-xs font-medium">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Approve
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="card overflow-hidden">
        <div className="p-4 border-b border-slate-100"><h3 className="section-title">Payment History</h3></div>
        {!payments?.items?.length ? (
          <EmptyState icon={Receipt} title="No payment records yet" description="Household staff payment records will appear here once recorded." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr>
                <th className="table-header text-left">Month</th>
                <th className="table-header text-left">Due</th>
                <th className="table-header text-left">Paid</th>
                <th className="table-header text-left">Status</th>
              </tr></thead>
              <tbody>
                {payments.items.map((p) => (
                  <tr key={p._id} className="table-row">
                    <td className="table-cell text-sm">{p.billingMonth}</td>
                    <td className="table-cell">{formatPaise(p.duePaise)}</td>
                    <td className="table-cell">{formatPaise(p.paidPaise)}</td>
                    <td className="table-cell"><span className={cn('badge', HOUSEHOLD_PAYMENT_STATUS_BADGE[p.status])}>{p.status}</span></td>
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
