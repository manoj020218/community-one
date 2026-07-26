import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, ListTree } from 'lucide-react';
import toast from 'react-hot-toast';
import { api, extractData } from '../../services/api';
import { Modal } from '../../components/common/Modal';
import { EmptyState } from '../../components/common/EmptyState';
import { TableSkeleton } from '../../components/common/LoadingSkeleton';
import { useAuthStore } from '../../store/authStore';
import { useSocietyStore } from '../../store/societyStore';
import { cn } from '../../utils/cn';
import { ChargeHead, formatPaise, MCR_CALCULATION_METHODS, MCR_CHARGE_HEAD_CATEGORIES } from './mcr.types';

const BLANK_FORM = {
  code: '', name: '', description: '', category: 'MAINTENANCE', isRecurring: true,
  defaultAmountPaise: '', calculationMethod: 'FIXED_FLAT', displayOrder: '0',
};

export function McrChargeHeadsTab() {
  const { user } = useAuthStore();
  const { currentSociety } = useSocietyStore();
  const societyId = currentSociety?._id || user?.societyId || '';
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(BLANK_FORM);

  const { data, isLoading } = useQuery({
    queryKey: ['mcr-charge-heads', societyId],
    queryFn: () => extractData<ChargeHead[]>(api.get('/mcr/charge-heads', { params: { societyId } })),
    enabled: !!societyId,
  });

  const mutation = useMutation({
    mutationFn: () => api.post('/mcr/charge-heads', {
      societyId,
      code: form.code,
      name: form.name,
      description: form.description || undefined,
      category: form.category,
      isRecurring: form.isRecurring,
      defaultAmountPaise: Math.round(Number(form.defaultAmountPaise || 0) * 100),
      calculationMethod: form.calculationMethod,
      displayOrder: Number(form.displayOrder || 0),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mcr-charge-heads'] });
      setShowModal(false);
      setForm(BLANK_FORM);
      toast.success('Charge head created!');
    },
  });

  const set = (k: keyof typeof BLANK_FORM) => (v: string | boolean) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Add Charge Head
        </button>
      </div>

      {isLoading ? <TableSkeleton rows={4} cols={5} /> : !data?.length ? (
        <EmptyState icon={ListTree} title="No charge heads yet" description="Define charge heads like Monthly Maintenance, Sinking Fund, or Parking to build billing plans."
          action={<button onClick={() => setShowModal(true)} className="btn-primary">Add Charge Head</button>} />
      ) : (
        <div className="card overflow-hidden overflow-x-auto">
          <table className="w-full">
            <thead><tr>
              <th className="table-header text-left">Code</th>
              <th className="table-header text-left">Name</th>
              <th className="table-header text-left">Category</th>
              <th className="table-header text-left">Default Amount</th>
              <th className="table-header text-left">Status</th>
            </tr></thead>
            <tbody>
              {data.map((ch) => (
                <tr key={ch._id} className="table-row">
                  <td className="table-cell font-mono text-xs">{ch.code}</td>
                  <td className="table-cell font-medium text-slate-800">{ch.name}</td>
                  <td className="table-cell text-xs text-slate-500">{ch.category.replace('_', ' ')}</td>
                  <td className="table-cell">{formatPaise(ch.defaultAmountPaise)}</td>
                  <td className="table-cell"><span className={cn('badge', ch.isActive ? 'badge-green' : 'badge-gray')}>{ch.isActive ? 'Active' : 'Inactive'}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Add Charge Head">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div><label className="label">Code <span className="text-red-500">*</span></label>
              <input value={form.code} onChange={(e) => set('code')(e.target.value)} className="input" placeholder="MAINT" /></div>
            <div><label className="label">Name <span className="text-red-500">*</span></label>
              <input value={form.name} onChange={(e) => set('name')(e.target.value)} className="input" placeholder="Monthly Maintenance" /></div>
          </div>
          <div><label className="label">Description</label>
            <input value={form.description} onChange={(e) => set('description')(e.target.value)} className="input" placeholder="Optional" /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="label">Category</label>
              <select value={form.category} onChange={(e) => set('category')(e.target.value)} className="input">
                {MCR_CHARGE_HEAD_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
              </select></div>
            <div><label className="label">Calculation Method</label>
              <select value={form.calculationMethod} onChange={(e) => set('calculationMethod')(e.target.value)} className="input">
                {MCR_CALCULATION_METHODS.map((m) => <option key={m}>{m}</option>)}
              </select></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="label">Default Amount (₹)</label>
              <input type="number" value={form.defaultAmountPaise} onChange={(e) => set('defaultAmountPaise')(e.target.value)} className="input" placeholder="2500" min={0} /></div>
            <div><label className="label">Display Order</label>
              <input type="number" value={form.displayOrder} onChange={(e) => set('displayOrder')(e.target.value)} className="input" min={0} /></div>
          </div>
          <label className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 cursor-pointer">
            <span className="text-sm font-medium text-slate-700">Recurring charge</span>
            <input type="checkbox" checked={form.isRecurring} onChange={(e) => set('isRecurring')(e.target.checked)} className="w-5 h-5 text-indigo-600 rounded" />
          </label>
          <div className="flex gap-3 pt-2">
            <button onClick={() => mutation.mutate()} disabled={mutation.isPending || !form.code || !form.name} className="btn-primary flex-1">
              {mutation.isPending ? 'Creating...' : 'Create'}
            </button>
            <button onClick={() => setShowModal(false)} className="btn-secondary">Cancel</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
