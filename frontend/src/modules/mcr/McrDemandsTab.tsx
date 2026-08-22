import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, FileText, Send, Zap, AlarmClock, BellRing, Ban } from 'lucide-react';
import toast from 'react-hot-toast';
import { api, extractData } from '../../services/api';
import { Modal } from '../../components/common/Modal';
import { EmptyState } from '../../components/common/EmptyState';
import { TableSkeleton } from '../../components/common/LoadingSkeleton';
import { TowerTabBar } from '../../components/common/TowerTabBar';
import { useAuthStore } from '../../store/authStore';
import { useSocietyStore } from '../../store/societyStore';
import { Tower } from '../../types';
import { cn, formatDate } from '../../utils/cn';
import { BillingPlan, DEMAND_STATUS_BADGE, formatPaise, MaintenanceDemand, MCR_DEMAND_STATUSES } from './mcr.types';

const currentMonthKey = () => new Date().toISOString().slice(0, 7);

export function McrDemandsTab() {
  const { user } = useAuthStore();
  const { currentSociety } = useSocietyStore();
  const societyId = currentSociety?._id || user?.societyId || '';
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('');
  const [towerFilter, setTowerFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ billingPlanId: '', billingPeriodKey: currentMonthKey(), billingPeriodLabel: '', towerId: '' });
  const [cancelTarget, setCancelTarget] = useState<MaintenanceDemand | null>(null);
  const [cancelReason, setCancelReason] = useState('');

  const { data: towers } = useQuery({
    queryKey: ['towers', societyId],
    queryFn: () => extractData<Tower[]>(api.get(`/towers/society/${societyId}`)),
    enabled: !!societyId,
  });

  const { data, isLoading } = useQuery({
    queryKey: ['mcr-demands', societyId, statusFilter, towerFilter],
    queryFn: () => extractData<MaintenanceDemand[]>(api.get('/mcr/demands', { params: { societyId, ...(statusFilter ? { status: statusFilter } : {}), ...(towerFilter ? { towerId: towerFilter } : {}) } })),
    enabled: !!societyId,
  });

  const { data: billingPlans } = useQuery({
    queryKey: ['mcr-billing-plans', societyId],
    queryFn: () => extractData<BillingPlan[]>(api.get('/mcr/billing-plans', { params: { societyId } })),
    enabled: !!societyId && showModal,
  });

  // Generating/publishing/cancelling demands (or running late-fee/automation, which do the
  // same under the hood) changes totalDemandPaise/outstandingPaise — without this the MCR
  // Dashboard's summary cards kept showing pre-change totals until their 5-minute staleTime.
  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['mcr-demands'] });
    queryClient.invalidateQueries({ queryKey: ['mcr-summary'] });
    queryClient.invalidateQueries({ queryKey: ['mcr-statement'] });
  };

  const draftMutation = useMutation({
    mutationFn: () => api.post('/mcr/demands/drafts', { societyId, ...form, towerId: form.towerId || undefined }),
    onSuccess: (res: any) => {
      invalidate();
      setShowModal(false);
      setForm((f) => ({ ...f, towerId: '' }));
      toast.success(`Generated ${res.data?.data?.createdCount ?? 'new'} draft demand(s)`);
    },
  });

  const publishMutation = useMutation({
    mutationFn: (demandId: string) => api.post(`/mcr/demands/${demandId}/publish`, { societyId }),
    onSuccess: () => { invalidate(); toast.success('Demand published!'); },
  });

  const reminderMutation = useMutation({
    mutationFn: (demandId: string) => api.post(`/mcr/demands/${demandId}/reminders`, { societyId, channels: ['IN_APP'] }),
    onSuccess: () => toast.success('Reminder sent'),
  });

  const automationMutation = useMutation({
    mutationFn: () => api.post('/mcr/demands/automation/run', { societyId, limit: 12 }),
    onSuccess: () => { invalidate(); toast.success('Demand automation run complete'); },
  });

  const lateFeeMutation = useMutation({
    mutationFn: () => api.post('/mcr/late-fees/run', { societyId, limit: 50 }),
    onSuccess: () => { invalidate(); toast.success('Late-fee run complete'); },
  });

  const remindersRunMutation = useMutation({
    mutationFn: () => api.post('/mcr/reminders/run', { societyId, limit: 50, channels: ['IN_APP'] }),
    onSuccess: () => toast.success('Reminders dispatched'),
  });

  const cancelMutation = useMutation({
    mutationFn: () => api.post(`/mcr/demands/${cancelTarget!._id}/cancel`, { societyId, reason: cancelReason }),
    onSuccess: () => { invalidate(); toast.success('Demand cancelled'); setCancelTarget(null); setCancelReason(''); },
  });

  const towerNameById = new Map((towers || []).map((t) => [t._id, t.name]));

  return (
    <div className="space-y-6">
      <TowerTabBar towers={towers || []} selected={towerFilter} onSelect={setTowerFilter} allLabel="All Blocks" />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="input w-auto">
          <option value="">All statuses</option>
          {MCR_DEMAND_STATUSES.map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
        </select>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => automationMutation.mutate()} disabled={automationMutation.isPending} className="btn-secondary flex items-center gap-2 text-sm">
            <Zap className="w-4 h-4" /> Run Automation
          </button>
          <button onClick={() => lateFeeMutation.mutate()} disabled={lateFeeMutation.isPending} className="btn-secondary flex items-center gap-2 text-sm">
            <AlarmClock className="w-4 h-4" /> Run Late Fees
          </button>
          <button onClick={() => remindersRunMutation.mutate()} disabled={remindersRunMutation.isPending} className="btn-secondary flex items-center gap-2 text-sm">
            <BellRing className="w-4 h-4" /> Send Reminders
          </button>
          <button onClick={() => { setForm((f) => ({ ...f, towerId: towerFilter })); setShowModal(true); }} className="btn-primary flex items-center gap-2 text-sm">
            <Plus className="w-4 h-4" /> Generate Drafts
          </button>
        </div>
      </div>

      {isLoading ? <TableSkeleton rows={5} cols={6} /> : !data?.length ? (
        <EmptyState icon={FileText} title="No demands found" description="Generate draft demands from a billing plan to get started."
          action={<button onClick={() => setShowModal(true)} className="btn-primary">Generate Drafts</button>} />
      ) : (
        <div className="card overflow-hidden overflow-x-auto">
          <table className="w-full">
            <thead><tr>
              <th className="table-header text-left">Demand #</th>
              <th className="table-header text-left">Flat</th>
              {(towers?.length || 0) > 1 && <th className="table-header text-left">Block</th>}
              <th className="table-header text-left">Period</th>
              <th className="table-header text-left">Due Date</th>
              <th className="table-header text-left">Total</th>
              <th className="table-header text-left">Outstanding</th>
              <th className="table-header text-left">Status</th>
              <th className="table-header text-left">Actions</th>
            </tr></thead>
            <tbody>
              {data.map((demand) => (
                <tr key={demand._id} className="table-row">
                  <td className="table-cell font-mono text-xs">{demand.demandNumber || '—'}</td>
                  <td className="table-cell text-xs text-slate-600">{demand.flatSnapshot?.flatNo || (typeof demand.flatId === 'object' ? demand.flatId.flatNo : null) || '—'}</td>
                  {(towers?.length || 0) > 1 && (
                    <td className="table-cell text-xs text-slate-500">{(demand.flatSnapshot?.towerId && towerNameById.get(demand.flatSnapshot.towerId)) || '—'}</td>
                  )}
                  <td className="table-cell text-xs text-slate-500">{demand.billingPeriodLabel}</td>
                  <td className="table-cell text-xs text-slate-500">{formatDate(demand.dueDate)}</td>
                  <td className="table-cell">{formatPaise(demand.totalDemandPaise)}</td>
                  <td className="table-cell font-semibold">{formatPaise(demand.outstandingPaise)}</td>
                  <td className="table-cell"><span className={cn('badge', DEMAND_STATUS_BADGE[demand.status])}>{demand.status.replace('_', ' ')}</span></td>
                  <td className="table-cell">
                    <div className="flex gap-2">
                      {demand.status === 'DRAFT' && (
                        <button onClick={() => publishMutation.mutate(demand._id)} disabled={publishMutation.isPending} className="text-primary-600 hover:text-primary-700 text-xs font-medium flex items-center gap-1">
                          <Send className="w-3.5 h-3.5" /> Publish
                        </button>
                      )}
                      {demand.status !== 'DRAFT' && demand.status !== 'CANCELLED' && (
                        <button onClick={() => reminderMutation.mutate(demand._id)} disabled={reminderMutation.isPending} className="text-slate-500 hover:text-slate-700 text-xs font-medium flex items-center gap-1">
                          <BellRing className="w-3.5 h-3.5" /> Remind
                        </button>
                      )}
                      {['DRAFT', 'PUBLISHED', 'OVERDUE'].includes(demand.status) && (
                        <button onClick={() => setCancelTarget(demand)} className="text-red-600 hover:text-red-700 text-xs font-medium flex items-center gap-1" title="Cancel this demand — e.g. it was generated for a flat that no longer exists">
                          <Ban className="w-3.5 h-3.5" /> Cancel
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Generate Draft Demands">
        <div className="space-y-4">
          <div><label className="label">Billing Plan <span className="text-red-500">*</span></label>
            <select value={form.billingPlanId} onChange={(e) => setForm((f) => ({ ...f, billingPlanId: e.target.value }))} className="input">
              <option value="">Select billing plan...</option>
              {billingPlans?.map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}
            </select></div>
          <div><label className="label">Billing Period Key <span className="text-red-500">*</span></label>
            <input value={form.billingPeriodKey} onChange={(e) => setForm((f) => ({ ...f, billingPeriodKey: e.target.value }))} className="input" placeholder="2026-07" /></div>
          <div><label className="label">Billing Period Label</label>
            <input value={form.billingPeriodLabel} onChange={(e) => setForm((f) => ({ ...f, billingPeriodLabel: e.target.value }))} className="input" placeholder="July 2026" /></div>
          {(towers?.length || 0) > 1 && (
            <div><label className="label">Block / Tower</label>
              <select value={form.towerId} onChange={(e) => setForm((f) => ({ ...f, towerId: e.target.value }))} className="input">
                <option value="">All blocks</option>
                {towers?.map((t) => <option key={t._id} value={t._id}>{t.name}</option>)}
              </select>
            </div>
          )}
          <p className="text-xs text-slate-500">
            {form.towerId ? 'Generates drafts only for eligible flats in the selected block.' : 'Leaving the block unspecified generates drafts for all eligible flats in the society.'}
          </p>
          <div className="flex gap-3 pt-2">
            <button onClick={() => draftMutation.mutate()} disabled={draftMutation.isPending || !form.billingPlanId || !form.billingPeriodKey} className="btn-primary flex-1">
              {draftMutation.isPending ? 'Generating...' : 'Generate'}
            </button>
            <button onClick={() => setShowModal(false)} className="btn-secondary">Cancel</button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={!!cancelTarget} onClose={() => { setCancelTarget(null); setCancelReason(''); }} title={`Cancel Demand ${cancelTarget?.demandNumber || ''}`}>
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            This marks the demand as cancelled and zeroes its outstanding balance — use this when a demand no longer applies,
            e.g. it was generated for a flat that's since been deleted. Not available once any payment has been recorded against it.
          </p>
          <div><label className="label">Reason <span className="text-red-500">*</span></label>
            <textarea value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} className="input resize-none" rows={3} placeholder="Required — minimum 3 characters" /></div>
          <div className="flex gap-3 pt-2">
            <button onClick={() => cancelMutation.mutate()} disabled={cancelMutation.isPending || cancelReason.trim().length < 3} className="btn-danger flex-1">
              {cancelMutation.isPending ? 'Cancelling...' : 'Confirm Cancel'}
            </button>
            <button onClick={() => { setCancelTarget(null); setCancelReason(''); }} className="btn-secondary">Back</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
