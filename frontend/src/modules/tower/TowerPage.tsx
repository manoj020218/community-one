import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Layers3, Building2 } from 'lucide-react';
import { api, extractData } from '../../services/api';
import { PageHeader } from '../../components/common/PageHeader';
import { EmptyState } from '../../components/common/EmptyState';
import { Modal } from '../../components/common/Modal';
import { VoiceInputField } from '../../components/common/VoiceInputField';
import { useAuthStore } from '../../store/authStore';
import { useSocietyStore } from '../../store/societyStore';
import { Tower } from '../../types';
import toast from 'react-hot-toast';

const TOWER_TYPES = ['TOWER','BLOCK','VILLA_ROW','SHOP_BLOCK','OTHER'];

export function TowerPage() {
  const { user } = useAuthStore();
  const { currentSociety } = useSocietyStore();
  const societyId = currentSociety?._id || user?.societyId || '';
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ societyId, name: '', type: 'TOWER', numberOfFloors: 10, hasLift: false });
  const [genCount, setGenCount] = useState(3);

  const { data: towers = [], isLoading } = useQuery({ queryKey: ['towers', societyId], queryFn: () => extractData<Tower[]>(api.get(`/towers/society/${societyId}`)), enabled: !!societyId });
  const mutation = useMutation({ mutationFn: (d: any) => api.post('/towers', d), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['towers'] }); setShowModal(false); toast.success('Tower created!'); } });
  const genMutation = useMutation({ mutationFn: () => api.post('/towers/generate', { societyId, count: genCount }), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['towers'] }); toast.success(`${genCount} towers generated!`); } });

  const set = (k: string) => (v: any) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <div className="space-y-6">
      <PageHeader title="Towers & Blocks" subtitle="Manage building structure"
        action={<div className="flex gap-2">
          <button onClick={() => genMutation.mutate()} className="btn-secondary text-sm flex items-center gap-1.5"><Building2 className="w-4 h-4" />Generate {genCount}</button>
          <input type="number" value={genCount} onChange={(e) => setGenCount(+e.target.value)} className="w-16 input text-sm py-2" min={1} max={12} />
          <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2"><Plus className="w-4 h-4" /> Add Tower</button>
        </div>} />

      {isLoading ? <div className="card p-8 text-center text-slate-400">Loading...</div> : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {towers.length === 0 ? (
            <div className="col-span-full"><EmptyState icon={Layers3} title="No towers yet" description="Add towers to begin structuring your society" action={<button onClick={() => setShowModal(true)} className="btn-primary">Add Tower</button>} /></div>
          ) : towers.map((t) => (
            <div key={t._id} className="card p-5">
              <div className="flex items-start gap-3 mb-3">
                <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center"><Layers3 className="w-5 h-5" /></div>
                <div><h3 className="font-semibold text-slate-800">{t.name}</h3><p className="text-xs text-slate-500">{t.type}</p></div>
                <span className={`badge ml-auto ${t.status === 'ACTIVE' ? 'badge-green' : 'badge-gray'}`}>{t.status}</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-slate-50 rounded-xl p-2"><p className="text-lg font-bold text-slate-800">{t.numberOfFloors}</p><p className="text-xs text-slate-500">Floors</p></div>
                <div className="bg-slate-50 rounded-xl p-2"><p className="text-lg font-bold text-slate-800">{t.totalFlats}</p><p className="text-xs text-slate-500">Flats</p></div>
                <div className="bg-slate-50 rounded-xl p-2"><p className="text-lg font-bold text-slate-800">{t.hasLift ? 'Yes' : 'No'}</p><p className="text-xs text-slate-500">Lift</p></div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Add Tower/Block">
        <div className="space-y-4">
          <VoiceInputField label="Tower Name" value={form.name} onChange={(v) => set('name')(v)} placeholder="Tower A" required />
          <div><label className="label">Type</label><select value={form.type} onChange={(e) => set('type')(e.target.value)} className="input">{TOWER_TYPES.map((t) => <option key={t}>{t.replace(/_/g, ' ')}</option>)}</select></div>
          <div><label className="label">Number of Floors</label><input type="number" value={form.numberOfFloors} onChange={(e) => set('numberOfFloors')(+e.target.value)} className="input" min={1} /></div>
          <label className="flex items-center gap-2 text-sm cursor-pointer"><input type="checkbox" checked={form.hasLift} onChange={(e) => set('hasLift')(e.target.checked)} className="w-4 h-4 text-primary-600" />Has Lift/Elevator</label>
          <div className="flex gap-3 pt-2">
            <button onClick={() => mutation.mutate({ ...form, societyId })} disabled={mutation.isPending} className="btn-primary flex-1">{mutation.isPending ? 'Creating...' : 'Create Tower'}</button>
            <button onClick={() => setShowModal(false)} className="btn-secondary">Cancel</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
