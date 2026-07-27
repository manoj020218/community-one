import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Briefcase } from 'lucide-react';
import toast from 'react-hot-toast';
import { api, extractData } from '../../services/api';
import { Modal } from '../../components/common/Modal';
import { EmptyState } from '../../components/common/EmptyState';
import { TableSkeleton } from '../../components/common/LoadingSkeleton';
import { useAuthStore } from '../../store/authStore';
import { useSocietyStore } from '../../store/societyStore';
import { cn } from '../../utils/cn';
import { PaginatedResult, SAMA_PROVIDER_STATUSES, SAMA_PROVIDER_TYPES, SAMA_VERIFICATION_STATUSES, ServiceProviderProfile } from './sama.types';

const BLANK_FORM = { displayName: '', providerType: 'INDIVIDUAL' as string, contactPersonName: '', mobile: '', email: '', serviceCategories: '' };

const statusBadge: Record<string, string> = { ACTIVE: 'badge-green', SUSPENDED: 'badge-yellow', INACTIVE: 'badge-gray' };

export function SamaProvidersTab() {
  const { user } = useAuthStore();
  const { currentSociety } = useSocietyStore();
  const societyId = currentSociety?._id || user?.societyId || '';
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(BLANK_FORM);

  const { data, isLoading } = useQuery({
    queryKey: ['sama-providers', societyId],
    queryFn: () => extractData<PaginatedResult<ServiceProviderProfile>>(api.get('/sama/service-providers', { params: { societyId, limit: 100 } })),
    enabled: !!societyId,
  });

  const createMutation = useMutation({
    mutationFn: () => api.post('/sama/service-providers', {
      societyId, displayName: form.displayName, providerType: form.providerType,
      contactPersonName: form.contactPersonName || undefined, mobile: form.mobile, email: form.email || undefined,
      serviceCategories: form.serviceCategories.split(',').map((s) => s.trim()).filter(Boolean),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sama-providers'] });
      setShowModal(false);
      setForm(BLANK_FORM);
      toast.success('Service provider added!');
    },
  });

  const updateMutation = useMutation({
    mutationFn: (vars: { providerId: string; field: 'status' | 'verificationStatus'; value: string }) =>
      api.patch(`/sama/service-providers/${vars.providerId}`, { societyId, [vars.field]: vars.value }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['sama-providers'] }); toast.success('Provider updated'); },
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Add Provider
        </button>
      </div>

      {isLoading ? <TableSkeleton rows={4} cols={6} /> : !data?.items?.length ? (
        <EmptyState icon={Briefcase} title="No service providers yet" description="Register contractors and visiting technicians here to assign them work orders."
          action={<button onClick={() => setShowModal(true)} className="btn-primary">Add Provider</button>} />
      ) : (
        <div className="card overflow-hidden overflow-x-auto">
          <table className="w-full">
            <thead><tr>
              <th className="table-header text-left">Code</th>
              <th className="table-header text-left">Name</th>
              <th className="table-header text-left">Type</th>
              <th className="table-header text-left">Categories</th>
              <th className="table-header text-left">Status</th>
              <th className="table-header text-left">Verification</th>
            </tr></thead>
            <tbody>
              {data.items.map((p) => (
                <tr key={p._id} className="table-row">
                  <td className="table-cell font-mono text-xs">{p.providerCode}</td>
                  <td className="table-cell font-medium text-slate-800">{p.displayName}</td>
                  <td className="table-cell text-xs text-slate-500">{p.providerType}</td>
                  <td className="table-cell text-xs text-slate-500">{p.serviceCategories.join(', ')}</td>
                  <td className="table-cell">
                    <select value={p.status} onChange={(e) => updateMutation.mutate({ providerId: p._id, field: 'status', value: e.target.value })} className={cn('badge border-0 text-xs', statusBadge[p.status])}>
                      {SAMA_PROVIDER_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </td>
                  <td className="table-cell">
                    <select value={p.verificationStatus} onChange={(e) => updateMutation.mutate({ providerId: p._id, field: 'verificationStatus', value: e.target.value })} className="input py-1 text-xs w-auto">
                      {SAMA_VERIFICATION_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Add Service Provider">
        <div className="space-y-4">
          <div><label className="label">Display Name <span className="text-red-500">*</span></label>
            <input value={form.displayName} onChange={(e) => setForm((f) => ({ ...f, displayName: e.target.value }))} className="input" /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="label">Provider Type</label>
              <select value={form.providerType} onChange={(e) => setForm((f) => ({ ...f, providerType: e.target.value }))} className="input">
                {SAMA_PROVIDER_TYPES.map((t) => <option key={t}>{t}</option>)}
              </select></div>
            <div><label className="label">Contact Person</label>
              <input value={form.contactPersonName} onChange={(e) => setForm((f) => ({ ...f, contactPersonName: e.target.value }))} className="input" /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="label">Mobile <span className="text-red-500">*</span></label>
              <input value={form.mobile} onChange={(e) => setForm((f) => ({ ...f, mobile: e.target.value }))} className="input" /></div>
            <div><label className="label">Email</label>
              <input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} className="input" /></div>
          </div>
          <div><label className="label">Service Categories</label>
            <input value={form.serviceCategories} onChange={(e) => setForm((f) => ({ ...f, serviceCategories: e.target.value }))} className="input" placeholder="Plumbing, Electrical" /></div>
          <div className="flex gap-3 pt-2">
            <button onClick={() => createMutation.mutate()} disabled={createMutation.isPending || !form.displayName || !form.mobile} className="btn-primary flex-1">
              {createMutation.isPending ? 'Adding...' : 'Add'}
            </button>
            <button onClick={() => setShowModal(false)} className="btn-secondary">Cancel</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
