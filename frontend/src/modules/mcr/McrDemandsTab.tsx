import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, FileText, Send, Zap, AlarmClock, BellRing } from 'lucide-react';
import toast from 'react-hot-toast';
import { api, extractData } from '../../services/api';
import { Modal } from '../../components/common/Modal';
import { EmptyState } from '../../components/common/EmptyState';
import { TableSkeleton } from '../../components/common/LoadingSkeleton';
import { useAuthStore } from '../../store/authStore';
import { useSocietyStore } from '../../store/societyStore';
import { cn, formatDate } from '../../utils/cn';
import { BillingPlan, DEMAND_STATUS_BADGE, formatPaise, MaintenanceDemand, MCR_DEMAND_STATUSES } from './mcr.types';

const currentMonthKey = () => new Date().toISOString().slice(0, 7);

export function McrDemandsTab() {
  const { user } = useAuthStore();
  const { currentSociety } = useSocietyStore();
  const societyId = currentSociety?._id || user?.societyId || '';
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ billingPlanId: '', billingPeriodKey: currentMonthKey(), billingPeriodLabel: '' });

  const { data, isLoading } = useQuery({
    queryKey: ['mcr-demands', societyId, statusFilter],
    queryFn: () => extractData<MaintenanceDemand[]>(api.get('/mcr/demands', { params: { societyId, ...(statusFilter ? { status: statusFilter } : {}) } })),
    enabled: !!societyId,
  });

  const { data: billingPlans } = useQuery({
    queryKey: ['mcr-billing-plans', societyId],
    queryFn: () => extractData<BillingPlan[]>(api.get('/mcr/billing-plans', { params: { societyId } })),
    enabled: !!societyId && showModal,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['mcr-demands'] });

  const draftMutation = useMutation({
    mutationFn: () => api.post('/mcr/demands/drafts', { societyId, ...form }),
    onSuccess: (res: any) => {
      invalidate();
      setShowModal(false);
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

  return (
    <div className="space-y-6">
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
          <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2 text-sm">
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
                  <td className="table-cell text-xs text-slate-600">{typeof demand.flatId === 'object' ? demand.flatId.flatNo : demand.flatId}</td>
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
                      {demand.status !== 'DRAFT' && (
                        <button onClick={() => reminderMutation.mutate(demand._id)} disabled={reminderMutation.isPending} className="text-slate-500 hover:text-slate-700 text-xs font-medium flex items-center gap-1">
                          <BellRing className="w-3.5 h-3.5" /> Remind
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
          <p className="text-xs text-slate-500">Leaving flats unspecified will generate drafts for all eligible flats in the society.</p>
          <div className="flex gap-3 pt-2">
            <button onClick={() => draftMutation.mutate()} disabled={draftMutation.isPending || !form.billingPlanId || !form.billingPeriodKey} className="btn-primary flex-1">
              {draftMutation.isPending ? 'Generating...' : 'Generate'}
            </button>
            <button onClick={() => setShowModal(false)} className="btn-secondary">Cancel</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
