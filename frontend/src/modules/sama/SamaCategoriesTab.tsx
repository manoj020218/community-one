import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Tag } from 'lucide-react';
import toast from 'react-hot-toast';
import { api, extractData } from '../../services/api';
import { Modal } from '../../components/common/Modal';
import { EmptyState } from '../../components/common/EmptyState';
import { TableSkeleton } from '../../components/common/LoadingSkeleton';
import { useAuthStore } from '../../store/authStore';
import { useSocietyStore } from '../../store/societyStore';
import { cn } from '../../utils/cn';
import { formatPaise, PaginatedResult, SAMA_STAFF_TYPES, StaffCategory } from './sama.types';

const BLANK_FORM = { code: '', name: '', description: '', staffTypes: [] as string[], defaultMonthlyRatePaise: '', requiresSocietyApproval: false };

export function SamaCategoriesTab() {
  const { user } = useAuthStore();
  const { currentSociety } = useSocietyStore();
  const societyId = currentSociety?._id || user?.societyId || '';
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(BLANK_FORM);

  const { data, isLoading } = useQuery({
    queryKey: ['sama-categories', societyId],
    queryFn: () => extractData<PaginatedResult<StaffCategory>>(api.get('/sama/staff-categories', { params: { societyId, limit: 100 } })),
    enabled: !!societyId,
  });

  const createMutation = useMutation({
    mutationFn: () => api.post('/sama/staff-categories', {
      societyId, code: form.code, name: form.name, description: form.description || undefined,
      staffTypes: form.staffTypes, defaultMonthlyRatePaise: form.defaultMonthlyRatePaise ? Math.round(Number(form.defaultMonthlyRatePaise) * 100) : undefined,
      requiresSocietyApproval: form.requiresSocietyApproval,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sama-categories'] });
      setShowModal(false);
      setForm(BLANK_FORM);
      toast.success('Category created!');
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: (vars: { categoryId: string; isActive: boolean }) => api.patch(`/sama/staff-categories/${vars.categoryId}`, { societyId, isActive: vars.isActive }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['sama-categories'] }); toast.success('Category updated'); },
  });

  const toggleType = (t: string) => setForm((f) => ({ ...f, staffTypes: f.staffTypes.includes(t) ? f.staffTypes.filter((x) => x !== t) : [...f.staffTypes, t] }));

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Add Category
        </button>
      </div>

      {isLoading ? <TableSkeleton rows={4} cols={5} /> : !data?.items?.length ? (
        <EmptyState icon={Tag} title="No staff categories yet" description="Define categories like Guard, Gardener or Maid to organize staff and suggest standard rates."
          action={<button onClick={() => setShowModal(true)} className="btn-primary">Add Category</button>} />
      ) : (
        <div className="card overflow-hidden overflow-x-auto">
          <table className="w-full">
            <thead><tr>
              <th className="table-header text-left">Code</th>
              <th className="table-header text-left">Name</th>
              <th className="table-header text-left">Applies To</th>
              <th className="table-header text-left">Default Rate</th>
              <th className="table-header text-left">Status</th>
            </tr></thead>
            <tbody>
              {data.items.map((cat) => (
                <tr key={cat._id} className="table-row">
                  <td className="table-cell font-mono text-xs">{cat.code}</td>
                  <td className="table-cell font-medium text-slate-800">{cat.name}</td>
                  <td className="table-cell text-xs text-slate-500">{cat.staffTypes.map((t) => t.replace(/_/g, ' ')).join(', ')}</td>
                  <td className="table-cell">{cat.defaultMonthlyRatePaise ? formatPaise(cat.defaultMonthlyRatePaise) : '—'}</td>
                  <td className="table-cell">
                    <button onClick={() => toggleActiveMutation.mutate({ categoryId: cat._id, isActive: !cat.isActive })} className={cn('badge', cat.isActive ? 'badge-green' : 'badge-gray')}>
                      {cat.isActive ? 'Active' : 'Inactive'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Add Staff Category">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div><label className="label">Code <span className="text-red-500">*</span></label>
              <input value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))} className="input" placeholder="GUARD" /></div>
            <div><label className="label">Name <span className="text-red-500">*</span></label>
              <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className="input" placeholder="Security Guard" /></div>
          </div>
          <div><label className="label">Description</label>
            <input value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} className="input" /></div>
          <div>
            <label className="label">Applies To Staff Types <span className="text-red-500">*</span></label>
            <div className="grid grid-cols-2 gap-2">
              {SAMA_STAFF_TYPES.map((t) => (
                <label key={t} className="flex items-center gap-2 text-sm text-slate-600">
                  <input type="checkbox" checked={form.staffTypes.includes(t)} onChange={() => toggleType(t)} className="w-4 h-4 text-indigo-600 rounded" />
                  {t.replace(/_/g, ' ')}
                </label>
              ))}
            </div>
          </div>
          <div><label className="label">Default Monthly Rate (₹)</label>
            <input type="number" value={form.defaultMonthlyRatePaise} onChange={(e) => setForm((f) => ({ ...f, defaultMonthlyRatePaise: e.target.value }))} className="input" min={0} /></div>
          <label className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 cursor-pointer">
            <span className="text-sm font-medium text-slate-700">Requires society approval</span>
            <input type="checkbox" checked={form.requiresSocietyApproval} onChange={(e) => setForm((f) => ({ ...f, requiresSocietyApproval: e.target.checked }))} className="w-5 h-5 text-indigo-600 rounded" />
          </label>
          <div className="flex gap-3 pt-2">
            <button onClick={() => createMutation.mutate()} disabled={createMutation.isPending || !form.code || !form.name || !form.staffTypes.length} className="btn-primary flex-1">
              {createMutation.isPending ? 'Creating...' : 'Create'}
            </button>
            <button onClick={() => setShowModal(false)} className="btn-secondary">Cancel</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
