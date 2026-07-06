import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, PawPrint, AlertTriangle } from 'lucide-react';
import { api, extractData } from '../../services/api';
import { PageHeader } from '../../components/common/PageHeader';
import { EmptyState } from '../../components/common/EmptyState';
import { Modal } from '../../components/common/Modal';
import { TableSkeleton } from '../../components/common/LoadingSkeleton';
import { VoiceInputField } from '../../components/common/VoiceInputField';
import { useAuthStore } from '../../store/authStore';
import { useSocietyStore } from '../../store/societyStore';
import { Pet } from '../../types';
import { formatDate } from '../../utils/cn';
import { cn } from '../../utils/cn';
import toast from 'react-hot-toast';

const PET_TYPES = ['DOG','CAT','BIRD','RABBIT','FISH','OTHER'];

export function PetPage() {
  const { user } = useAuthStore();
  const { currentSociety } = useSocietyStore();
  const societyId = currentSociety?._id || user?.societyId || '';
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [page, setPage] = useState(1);
  const [form, setForm] = useState({ societyId, residentId: '', petName: '', petType: 'DOG', breed: '', aggressiveFlag: false, vaccinationExpiryDate: '' });

  const { data: residents } = useQuery({ queryKey: ['residents-list', societyId], queryFn: () => extractData<any>(api.get(`/residents/society/${societyId}?limit=200`)), enabled: !!societyId });
  const { data, isLoading } = useQuery({ queryKey: ['pets', societyId, page], queryFn: () => extractData<any>(api.get(`/pets/society/${societyId}?page=${page}&limit=20`)), enabled: !!societyId });

  const mutation = useMutation({
    mutationFn: (d: any) => api.post('/pets', d),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['pets'] }); setShowModal(false); toast.success('Pet registered!'); resetForm(); },
  });

  const resetForm = () => setForm({ societyId, residentId: '', petName: '', petType: 'DOG', breed: '', aggressiveFlag: false, vaccinationExpiryDate: '' });
  const set = (k: string) => (v: any) => setForm((f) => ({ ...f, [k]: v }));
  const pets: Pet[] = data?.items || [];

  return (
    <div className="space-y-6">
      <PageHeader title="Pet Registry" subtitle="Track all registered pets in the society"
        action={<button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2"><Plus className="w-4 h-4" /> Register Pet</button>} />

      {isLoading ? <TableSkeleton rows={6} cols={5} /> : (
        <div className="card overflow-hidden">
          {pets.length === 0 ? (
            <EmptyState icon={PawPrint} title="No pets registered" description="Register pets owned by residents"
              action={<button onClick={() => setShowModal(true)} className="btn-primary">Register Pet</button>} />
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead><tr className="border-b border-slate-100">
                    <th className="table-header text-left">Pet Name</th>
                    <th className="table-header text-left">Type</th>
                    <th className="table-header text-left">Breed</th>
                    <th className="table-header text-left">Owner</th>
                    <th className="table-header text-left">Vaccination Expiry</th>
                    <th className="table-header text-left">Alert</th>
                  </tr></thead>
                  <tbody className="divide-y divide-slate-50">
                    {pets.map((p) => (
                      <tr key={p._id} className="table-row">
                        <td className="table-cell font-medium text-slate-800">{p.petName}</td>
                        <td className="table-cell"><span className="badge badge-purple">{p.petType}</span></td>
                        <td className="table-cell text-sm text-slate-600">{p.breed || '—'}</td>
                        <td className="table-cell text-sm text-slate-600">{(p.residentId as any)?.name || '—'}</td>
                        <td className="table-cell text-xs text-slate-500">{p.vaccinationExpiryDate ? formatDate(p.vaccinationExpiryDate) : '—'}</td>
                        <td className="table-cell">
                          {p.aggressiveFlag && <span className="flex items-center gap-1 text-red-600 text-xs font-medium"><AlertTriangle className="w-3 h-3" />Aggressive</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {data?.totalPages > 1 && (
                <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100">
                  <p className="text-sm text-slate-500">Page {page} of {data.totalPages} ({data.total} pets)</p>
                  <div className="flex gap-2">
                    <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="btn-secondary text-sm py-1.5 px-3 disabled:opacity-50">Prev</button>
                    <button disabled={page >= data.totalPages} onClick={() => setPage(p => p + 1)} className="btn-secondary text-sm py-1.5 px-3 disabled:opacity-50">Next</button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      <Modal isOpen={showModal} onClose={() => { setShowModal(false); resetForm(); }} title="Register Pet">
        <div className="space-y-4">
          <div><label className="label">Owner (Resident) <span className="text-red-500">*</span></label>
            <select value={form.residentId} onChange={(e) => set('residentId')(e.target.value)} className="input" required>
              <option value="">Select resident...</option>
              {residents?.items?.map((r: any) => <option key={r._id} value={r._id}>{r.name} — {(r.flatId as any)?.flatNo || 'N/A'}</option>)}
            </select></div>
          <VoiceInputField label="Pet Name" value={form.petName} onChange={set('petName')} placeholder="Bruno" required />
          <div className="grid grid-cols-2 gap-4">
            <div><label className="label">Pet Type</label>
              <select value={form.petType} onChange={(e) => set('petType')(e.target.value)} className="input">
                {PET_TYPES.map((t) => <option key={t}>{t}</option>)}
              </select></div>
            <div><label className="label">Breed</label>
              <input type="text" value={form.breed} onChange={(e) => set('breed')(e.target.value)} placeholder="Labrador" className="input" /></div>
          </div>
          <div><label className="label">Vaccination Expiry</label>
            <input type="date" value={form.vaccinationExpiryDate} onChange={(e) => set('vaccinationExpiryDate')(e.target.value)} className="input" /></div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.aggressiveFlag} onChange={(e) => set('aggressiveFlag')(e.target.checked)} className="w-4 h-4 text-red-500" />
            <span className="text-sm text-red-600 font-medium flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5" />Mark as Aggressive</span>
          </label>
          <div className="flex gap-3 pt-2">
            <button onClick={() => mutation.mutate(form)} disabled={mutation.isPending || !form.residentId || !form.petName} className="btn-primary flex-1">{mutation.isPending ? 'Registering...' : 'Register Pet'}</button>
            <button onClick={() => { setShowModal(false); resetForm(); }} className="btn-secondary">Cancel</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
