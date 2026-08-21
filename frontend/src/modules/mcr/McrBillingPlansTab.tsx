import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, CalendarClock, Pencil } from 'lucide-react';
import toast from 'react-hot-toast';
import { api, extractData } from '../../services/api';
import { Modal } from '../../components/common/Modal';
import { EmptyState } from '../../components/common/EmptyState';
import { TableSkeleton } from '../../components/common/LoadingSkeleton';
import { useAuthStore } from '../../store/authStore';
import { useSocietyStore } from '../../store/societyStore';
import { cn } from '../../utils/cn';
import { BillingPlan, ChargeHead, formatPaise, MCR_BILLING_FREQUENCIES } from './mcr.types';

const BLANK_LINE = { chargeHeadId: '', amountPaise: '' };
const BLANK_FORM = {
  name: '', frequency: 'MONTHLY', billingDay: '1', dueDay: '10',
  effectiveFrom: new Date().toISOString().slice(0, 10), autoGenerate: false, autoPublish: false,
};
const formFromPlan = (p: BillingPlan) => ({
  name: p.name, frequency: p.frequency, billingDay: String(p.billingDay), dueDay: String(p.dueDay),
  effectiveFrom: p.effectiveFrom.slice(0, 10), autoGenerate: p.autoGenerate, autoPublish: p.autoPublish,
});
const linesFromPlan = (p: BillingPlan) =>
  p.chargeLines.map((l) => ({ chargeHeadId: l.chargeHeadId, amountPaise: String(l.amountPaise / 100) }));

export function McrBillingPlansTab() {
  const { user } = useAuthStore();
  const { currentSociety } = useSocietyStore();
  const societyId = currentSociety?._id || user?.societyId || '';
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState<BillingPlan | null>(null);
  const [form, setForm] = useState(BLANK_FORM);
  const [lines, setLines] = useState([{ ...BLANK_LINE }]);

  const { data, isLoading } = useQuery({
    queryKey: ['mcr-billing-plans', societyId],
    queryFn: () => extractData<BillingPlan[]>(api.get('/mcr/billing-plans', { params: { societyId } })),
    enabled: !!societyId,
  });

  const { data: chargeHeads } = useQuery({
    queryKey: ['mcr-charge-heads', societyId],
    queryFn: () => extractData<ChargeHead[]>(api.get('/mcr/charge-heads', { params: { societyId } })),
    enabled: !!societyId && showModal,
  });

  const closeModal = () => { setShowModal(false); setEditTarget(null); setForm(BLANK_FORM); setLines([{ ...BLANK_LINE }]); };

  const bodyFromForm = () => ({
    societyId,
    name: form.name,
    frequency: form.frequency,
    billingDay: Number(form.billingDay),
    dueDay: Number(form.dueDay),
    effectiveFrom: form.effectiveFrom,
    autoGenerate: form.autoGenerate,
    autoPublish: form.autoPublish,
    chargeLines: lines.filter((l) => l.chargeHeadId).map((l) => ({
      chargeHeadId: l.chargeHeadId,
      amountPaise: Math.round(Number(l.amountPaise || 0) * 100),
      calculationMethod: 'FIXED_FLAT',
    })),
  });

  const mutation = useMutation({
    mutationFn: () => editTarget
      ? api.patch(`/mcr/billing-plans/${editTarget._id}`, bodyFromForm())
      : api.post('/mcr/billing-plans', bodyFromForm()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mcr-billing-plans'] });
      toast.success(editTarget ? 'Billing plan updated!' : 'Billing plan created!');
      closeModal();
    },
  });

  const set = (k: keyof typeof BLANK_FORM) => (v: string | boolean) => setForm((f) => ({ ...f, [k]: v }));
  const setLine = (i: number, k: keyof typeof BLANK_LINE) => (v: string) =>
    setLines((rows) => rows.map((row, idx) => {
      if (idx !== i) return row;
      // Picking a charge head prefills its default amount — the amount is still a plain
      // input, so the admin can override it for this plan without touching the charge head.
      if (k === 'chargeHeadId') {
        const defaultAmount = chargeHeads?.find((c) => c._id === v)?.defaultAmountPaise;
        return { chargeHeadId: v, amountPaise: defaultAmount != null ? String(defaultAmount / 100) : row.amountPaise };
      }
      return { ...row, [k]: v };
    }));

  const chargeHeadName = (id: string) => chargeHeads?.find((c) => c._id === id)?.name || id;
  const openEdit = (p: BillingPlan) => { setEditTarget(p); setForm(formFromPlan(p)); setLines(linesFromPlan(p)); setShowModal(true); };

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Add Billing Plan
        </button>
      </div>

      {isLoading ? <TableSkeleton rows={3} cols={5} /> : !data?.length ? (
        <EmptyState icon={CalendarClock} title="No billing plans yet" description="Billing plans define how often demands are raised and which charges apply."
          action={<button onClick={() => setShowModal(true)} className="btn-primary">Add Billing Plan</button>} />
      ) : (
        <div className="card overflow-hidden overflow-x-auto">
          <table className="w-full">
            <thead><tr>
              <th className="table-header text-left">Name</th>
              <th className="table-header text-left">Frequency</th>
              <th className="table-header text-left">Billing / Due Day</th>
              <th className="table-header text-left">Automation</th>
              <th className="table-header text-left">Status</th>
              <th className="table-header text-left">Actions</th>
            </tr></thead>
            <tbody>
              {data.map((plan) => (
                <tr key={plan._id} className="table-row group">
                  <td className="table-cell font-medium text-slate-800">{plan.name}</td>
                  <td className="table-cell text-xs text-slate-500">{plan.frequency.replace('_', ' ')}</td>
                  <td className="table-cell text-xs text-slate-500">{plan.billingDay} / {plan.dueDay}</td>
                  <td className="table-cell text-xs text-slate-500">
                    {plan.autoGenerate ? 'Auto-generate' : 'Manual'}{plan.autoPublish ? ' + Auto-publish' : ''}
                  </td>
                  <td className="table-cell"><span className={cn('badge', plan.isActive ? 'badge-green' : 'badge-gray')}>{plan.isActive ? 'Active' : 'Inactive'}</span></td>
                  <td className="table-cell">
                    <button onClick={() => openEdit(plan)} title="Edit" className="p-1.5 rounded-lg text-slate-400 opacity-0 group-hover:opacity-100 hover:bg-primary-50 hover:text-primary-600 transition-all">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal isOpen={showModal} onClose={closeModal} title={editTarget ? 'Edit Billing Plan' : 'Add Billing Plan'} size="lg">
        <div className="space-y-4">
          <div><label className="label">Name <span className="text-red-500">*</span></label>
            <input value={form.name} onChange={(e) => set('name')(e.target.value)} className="input" placeholder="Monthly Maintenance Plan" /></div>
          <div className="grid grid-cols-3 gap-4">
            <div><label className="label">Frequency</label>
              <select value={form.frequency} onChange={(e) => set('frequency')(e.target.value)} className="input">
                {MCR_BILLING_FREQUENCIES.map((f) => <option key={f}>{f}</option>)}
              </select></div>
            <div><label className="label">Billing Day</label>
              <input type="number" min={1} max={31} value={form.billingDay} onChange={(e) => set('billingDay')(e.target.value)} className="input" /></div>
            <div><label className="label">Due Day</label>
              <input type="number" min={1} max={31} value={form.dueDay} onChange={(e) => set('dueDay')(e.target.value)} className="input" /></div>
          </div>
          <div><label className="label">Effective From</label>
            <input type="date" value={form.effectiveFrom} onChange={(e) => set('effectiveFrom')(e.target.value)} className="input" /></div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="label mb-0">Charge Lines <span className="text-red-500">*</span></label>
              <button onClick={() => setLines((rows) => [...rows, { ...BLANK_LINE }])} className="text-xs text-primary-600 font-medium flex items-center gap-1">
                <Plus className="w-3.5 h-3.5" /> Add Line
              </button>
            </div>
            <div className="space-y-2">
              {lines.map((line, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <select value={line.chargeHeadId} onChange={(e) => setLine(i, 'chargeHeadId')(e.target.value)} className="input flex-1">
                    <option value="">Select charge head...</option>
                    {chargeHeads?.map((ch) => <option key={ch._id} value={ch._id}>{ch.name}</option>)}
                  </select>
                  <input type="number" placeholder="Amount ₹" value={line.amountPaise} onChange={(e) => setLine(i, 'amountPaise')(e.target.value)} className="input w-32" />
                  {lines.length > 1 && (
                    <button onClick={() => setLines((rows) => rows.filter((_, idx) => idx !== i))} className="p-2 text-slate-400 hover:text-red-600">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
            {!!lines.filter((l) => l.chargeHeadId).length && (
              <p className="text-xs text-slate-500 mt-2">
                Total per flat: {formatPaise(lines.reduce((sum, l) => sum + Math.round(Number(l.amountPaise || 0) * 100), 0))}
                {' — '}{lines.filter((l) => l.chargeHeadId).map((l) => chargeHeadName(l.chargeHeadId)).join(', ')}
              </p>
            )}
          </div>

          <label className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 cursor-pointer">
            <span className="text-sm font-medium text-slate-700">Auto-generate demands on schedule</span>
            <input type="checkbox" checked={form.autoGenerate} onChange={(e) => set('autoGenerate')(e.target.checked)} className="w-5 h-5 text-indigo-600 rounded" />
          </label>
          <label className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 cursor-pointer">
            <span className="text-sm font-medium text-slate-700">Auto-publish generated demands</span>
            <input type="checkbox" checked={form.autoPublish} onChange={(e) => set('autoPublish')(e.target.checked)} className="w-5 h-5 text-indigo-600 rounded" />
          </label>

          <div className="flex gap-3 pt-2">
            <button
              onClick={() => mutation.mutate()}
              disabled={mutation.isPending || !form.name || !lines.some((l) => l.chargeHeadId)}
              className="btn-primary flex-1"
            >
              {mutation.isPending ? 'Saving...' : editTarget ? 'Save Changes' : 'Create Billing Plan'}
            </button>
            <button onClick={closeModal} className="btn-secondary">Cancel</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
