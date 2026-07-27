import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Home, Wallet, Receipt } from 'lucide-react';
import toast from 'react-hot-toast';
import { api, extractData } from '../../services/api';
import { Modal } from '../../components/common/Modal';
import { EmptyState } from '../../components/common/EmptyState';
import { TableSkeleton } from '../../components/common/LoadingSkeleton';
import { useAuthStore } from '../../store/authStore';
import { useSocietyStore } from '../../store/societyStore';
import { cn } from '../../utils/cn';
import {
  ASSOCIATION_STATUS_BADGE, formatPaise, HOUSEHOLD_PAYMENT_STATUS_BADGE, HouseholdAssociation,
  HouseholdPaymentRecord, HouseholdRateCard, PaginatedResult, StaffEngagement,
} from './sama.types';

export function SamaHouseholdTab() {
  const { user } = useAuthStore();
  const { currentSociety } = useSocietyStore();
  const societyId = currentSociety?._id || user?.societyId || '';
  const queryClient = useQueryClient();

  const [showAssocModal, setShowAssocModal] = useState(false);
  const [assocForm, setAssocForm] = useState({ engagementId: '', services: '', monthlyRatePaise: '' });
  const [showRateModal, setShowRateModal] = useState(false);
  const [rateForm, setRateForm] = useState({ associationId: '', monthlyRatePaise: '', overtimeRatePaise: '', effectiveFrom: new Date().toISOString().slice(0, 10) });
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentForm, setPaymentForm] = useState({ associationId: '', billingMonth: new Date().toISOString().slice(0, 7), duePaise: '', paidPaise: '', paymentMethod: '' });

  const { data: associations, isLoading: loadingAssoc } = useQuery({
    queryKey: ['sama-associations', societyId],
    queryFn: () => extractData<PaginatedResult<HouseholdAssociation>>(api.get('/sama/household-associations', { params: { societyId, limit: 100 } })),
    enabled: !!societyId,
  });

  const { data: rateCards } = useQuery({
    queryKey: ['sama-rate-cards', societyId],
    queryFn: () => extractData<PaginatedResult<HouseholdRateCard>>(api.get('/sama/household-rate-cards', { params: { societyId, limit: 100 } })),
    enabled: !!societyId,
  });

  const { data: payments } = useQuery({
    queryKey: ['sama-household-payments', societyId],
    queryFn: () => extractData<PaginatedResult<HouseholdPaymentRecord>>(api.get('/sama/household-payments', { params: { societyId, limit: 100 } })),
    enabled: !!societyId,
  });

  const { data: engagements } = useQuery({
    queryKey: ['sama-household-engagements', societyId],
    queryFn: () => extractData<PaginatedResult<StaffEngagement>>(api.get('/sama/engagements', { params: { societyId, limit: 200 } })),
    enabled: !!societyId && showAssocModal,
  });

  const eligibleEngagements = engagements?.items?.filter((e) => e.engagementType === 'HOUSEHOLD_DIRECT') || [];

  const approveSocietyMutation = useMutation({
    mutationFn: (associationId: string) => api.post(`/sama/household-associations/${associationId}/approve-society`, { societyId }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['sama-associations'] }); toast.success('Association approved'); },
  });

  const createAssocMutation = useMutation({
    mutationFn: () => {
      const engagement = eligibleEngagements.find((e) => e._id === assocForm.engagementId);
      return api.post('/sama/household-associations', {
        societyId,
        staffProfileId: engagement?.staffProfileId,
        engagementId: assocForm.engagementId,
        flatId: engagement?.employerFlatId,
        residentId: engagement?.employerResidentId,
        services: assocForm.services.split(',').map((s) => s.trim()).filter(Boolean),
        monthlyRatePaise: assocForm.monthlyRatePaise ? Math.round(Number(assocForm.monthlyRatePaise) * 100) : undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sama-associations'] });
      setShowAssocModal(false);
      setAssocForm({ engagementId: '', services: '', monthlyRatePaise: '' });
      toast.success('Household association created!');
    },
  });

  const createRateCardMutation = useMutation({
    mutationFn: () => api.post('/sama/household-rate-cards', {
      societyId, associationId: rateForm.associationId,
      monthlyRatePaise: Math.round(Number(rateForm.monthlyRatePaise) * 100),
      overtimeRatePaise: rateForm.overtimeRatePaise ? Math.round(Number(rateForm.overtimeRatePaise) * 100) : undefined,
      effectiveFrom: rateForm.effectiveFrom,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sama-rate-cards'] });
      setShowRateModal(false);
      toast.success('Rate card created!');
    },
  });

  const createPaymentMutation = useMutation({
    mutationFn: () => api.post('/sama/household-payments', {
      societyId, associationId: paymentForm.associationId, billingMonth: paymentForm.billingMonth,
      duePaise: Math.round(Number(paymentForm.duePaise) * 100),
      paidPaise: paymentForm.paidPaise ? Math.round(Number(paymentForm.paidPaise) * 100) : undefined,
      paymentMethod: paymentForm.paymentMethod || undefined,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sama-household-payments'] });
      setShowPaymentModal(false);
      toast.success('Payment recorded!');
    },
  });

  return (
    <div className="space-y-6">
      <div className="card overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="section-title flex items-center gap-2"><Home className="w-4 h-4 text-slate-400" /> Household Associations</h3>
          <button onClick={() => setShowAssocModal(true)} className="btn-primary flex items-center gap-2 text-sm"><Plus className="w-4 h-4" /> Add Association</button>
        </div>
        {loadingAssoc ? <TableSkeleton rows={3} cols={4} /> : !associations?.items?.length ? (
          <EmptyState icon={Home} title="No household associations yet" description="Link household staff to a flat and resident once they have a HOUSEHOLD_DIRECT engagement." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr>
                <th className="table-header text-left">Flat</th>
                <th className="table-header text-left">Services</th>
                <th className="table-header text-left">Rate</th>
                <th className="table-header text-left">Status</th>
                <th className="table-header text-left">Action</th>
              </tr></thead>
              <tbody>
                {associations.items.map((a) => (
                  <tr key={a._id} className="table-row">
                    <td className="table-cell text-xs text-slate-600">{typeof a.flatId === 'object' ? a.flatId.flatNo : a.flatId}</td>
                    <td className="table-cell text-sm">{a.services.join(', ')}</td>
                    <td className="table-cell">{a.monthlyRatePaise ? formatPaise(a.monthlyRatePaise) : '—'}</td>
                    <td className="table-cell"><span className={cn('badge', ASSOCIATION_STATUS_BADGE[a.status])}>{a.status.replace(/_/g, ' ')}</span></td>
                    <td className="table-cell">
                      {a.status === 'PENDING_SOCIETY_APPROVAL' && (
                        <button onClick={() => approveSocietyMutation.mutate(a._id)} className="text-emerald-600 hover:text-emerald-700 text-xs font-medium">Approve</button>
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
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="section-title flex items-center gap-2"><Wallet className="w-4 h-4 text-slate-400" /> Rate Cards</h3>
          <button onClick={() => setShowRateModal(true)} className="btn-secondary flex items-center gap-2 text-sm"><Plus className="w-4 h-4" /> Add Rate Card</button>
        </div>
        {!rateCards?.items?.length ? (
          <EmptyState icon={Wallet} title="No rate cards yet" description="Set a monthly rate for an active household association." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr><th className="table-header text-left">Flat</th><th className="table-header text-left">Monthly Rate</th><th className="table-header text-left">Effective From</th><th className="table-header text-left">Status</th></tr></thead>
              <tbody>
                {rateCards.items.map((rc) => (
                  <tr key={rc._id} className="table-row">
                    <td className="table-cell text-xs text-slate-600">{typeof rc.flatId === 'object' ? rc.flatId.flatNo : rc.flatId}</td>
                    <td className="table-cell">{formatPaise(rc.monthlyRatePaise)}</td>
                    <td className="table-cell text-xs text-slate-500">{rc.effectiveFrom?.slice(0, 10)}</td>
                    <td className="table-cell"><span className={cn('badge', rc.isActive ? 'badge-green' : 'badge-gray')}>{rc.isActive ? 'Active' : 'Inactive'}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="card overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="section-title flex items-center gap-2"><Receipt className="w-4 h-4 text-slate-400" /> Payments</h3>
          <button onClick={() => setShowPaymentModal(true)} className="btn-secondary flex items-center gap-2 text-sm"><Plus className="w-4 h-4" /> Record Payment</button>
        </div>
        {!payments?.items?.length ? (
          <EmptyState icon={Receipt} title="No payments recorded yet" description="Record a household staff payment against a billing month." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr><th className="table-header text-left">Month</th><th className="table-header text-left">Due</th><th className="table-header text-left">Paid</th><th className="table-header text-left">Status</th></tr></thead>
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

      <Modal isOpen={showAssocModal} onClose={() => setShowAssocModal(false)} title="Add Household Association">
        <div className="space-y-4">
          <div><label className="label">Household Engagement <span className="text-red-500">*</span></label>
            <select value={assocForm.engagementId} onChange={(e) => setAssocForm((f) => ({ ...f, engagementId: e.target.value }))} className="input">
              <option value="">Select engagement...</option>
              {eligibleEngagements.map((e) => <option key={e._id} value={e._id}>{e.jobTitle || e._id}</option>)}
            </select>
            <p className="text-xs text-slate-500 mt-1">Only staff with a HOUSEHOLD_DIRECT engagement can be linked.</p></div>
          <div><label className="label">Services <span className="text-red-500">*</span></label>
            <input value={assocForm.services} onChange={(e) => setAssocForm((f) => ({ ...f, services: e.target.value }))} className="input" placeholder="Cooking, Cleaning" /></div>
          <div><label className="label">Monthly Rate (₹)</label>
            <input type="number" value={assocForm.monthlyRatePaise} onChange={(e) => setAssocForm((f) => ({ ...f, monthlyRatePaise: e.target.value }))} className="input" min={0} /></div>
          <div className="flex gap-3 pt-2">
            <button onClick={() => createAssocMutation.mutate()} disabled={createAssocMutation.isPending || !assocForm.engagementId || !assocForm.services} className="btn-primary flex-1">
              {createAssocMutation.isPending ? 'Creating...' : 'Create'}
            </button>
            <button onClick={() => setShowAssocModal(false)} className="btn-secondary">Cancel</button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={showRateModal} onClose={() => setShowRateModal(false)} title="Add Rate Card">
        <div className="space-y-4">
          <div><label className="label">Association <span className="text-red-500">*</span></label>
            <select value={rateForm.associationId} onChange={(e) => setRateForm((f) => ({ ...f, associationId: e.target.value }))} className="input">
              <option value="">Select association...</option>
              {associations?.items?.filter((a) => a.status === 'ACTIVE').map((a) => <option key={a._id} value={a._id}>{typeof a.flatId === 'object' ? a.flatId.flatNo : a.flatId} — {a.services.join(', ')}</option>)}
            </select></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="label">Monthly Rate (₹) <span className="text-red-500">*</span></label>
              <input type="number" value={rateForm.monthlyRatePaise} onChange={(e) => setRateForm((f) => ({ ...f, monthlyRatePaise: e.target.value }))} className="input" min={0} /></div>
            <div><label className="label">Overtime Rate (₹)</label>
              <input type="number" value={rateForm.overtimeRatePaise} onChange={(e) => setRateForm((f) => ({ ...f, overtimeRatePaise: e.target.value }))} className="input" min={0} /></div>
          </div>
          <div><label className="label">Effective From</label>
            <input type="date" value={rateForm.effectiveFrom} onChange={(e) => setRateForm((f) => ({ ...f, effectiveFrom: e.target.value }))} className="input" /></div>
          <div className="flex gap-3 pt-2">
            <button onClick={() => createRateCardMutation.mutate()} disabled={createRateCardMutation.isPending || !rateForm.associationId || !rateForm.monthlyRatePaise} className="btn-primary flex-1">
              {createRateCardMutation.isPending ? 'Creating...' : 'Create'}
            </button>
            <button onClick={() => setShowRateModal(false)} className="btn-secondary">Cancel</button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={showPaymentModal} onClose={() => setShowPaymentModal(false)} title="Record Household Payment">
        <div className="space-y-4">
          <div><label className="label">Association <span className="text-red-500">*</span></label>
            <select value={paymentForm.associationId} onChange={(e) => setPaymentForm((f) => ({ ...f, associationId: e.target.value }))} className="input">
              <option value="">Select association...</option>
              {associations?.items?.filter((a) => a.status === 'ACTIVE').map((a) => <option key={a._id} value={a._id}>{typeof a.flatId === 'object' ? a.flatId.flatNo : a.flatId} — {a.services.join(', ')}</option>)}
            </select></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="label">Billing Month <span className="text-red-500">*</span></label>
              <input type="month" value={paymentForm.billingMonth} onChange={(e) => setPaymentForm((f) => ({ ...f, billingMonth: e.target.value }))} className="input" /></div>
            <div><label className="label">Payment Method</label>
              <input value={paymentForm.paymentMethod} onChange={(e) => setPaymentForm((f) => ({ ...f, paymentMethod: e.target.value }))} className="input" placeholder="Cash / UPI" /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="label">Amount Due (₹) <span className="text-red-500">*</span></label>
              <input type="number" value={paymentForm.duePaise} onChange={(e) => setPaymentForm((f) => ({ ...f, duePaise: e.target.value }))} className="input" min={0} /></div>
            <div><label className="label">Amount Paid (₹)</label>
              <input type="number" value={paymentForm.paidPaise} onChange={(e) => setPaymentForm((f) => ({ ...f, paidPaise: e.target.value }))} className="input" min={0} /></div>
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={() => createPaymentMutation.mutate()} disabled={createPaymentMutation.isPending || !paymentForm.associationId || !paymentForm.billingMonth || !paymentForm.duePaise} className="btn-primary flex-1">
              {createPaymentMutation.isPending ? 'Recording...' : 'Record'}
            </button>
            <button onClick={() => setShowPaymentModal(false)} className="btn-secondary">Cancel</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
