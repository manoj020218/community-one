import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, LayoutGrid } from 'lucide-react';
import { api, extractData } from '../../services/api';
import { PageHeader } from '../../components/common/PageHeader';
import { EmptyState } from '../../components/common/EmptyState';
import { Modal } from '../../components/common/Modal';
import { useAuthStore } from '../../store/authStore';
import { useSocietyStore } from '../../store/societyStore';
import { Tower, Floor } from '../../types';
import toast from 'react-hot-toast';

export function FloorPage() {
  const { user } = useAuthStore();
  const { currentSociety } = useSocietyStore();
  const societyId = currentSociety?._id || user?.societyId || '';
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [selectedTower, setSelectedTower] = useState('');
  const [floorCount, setFloorCount] = useState(10);

  const { data: towers = [] } = useQuery({ queryKey: ['towers', societyId], queryFn: () => extractData<Tower[]>(api.get(`/towers/society/${societyId}`)), enabled: !!societyId });
  const { data: floors = [], isLoading } = useQuery({ queryKey: ['floors', selectedTower], queryFn: () => extractData<Floor[]>(api.get(`/floors/tower/${selectedTower}`)), enabled: !!selectedTower });
  const genMutation = useMutation({ mutationFn: () => api.post('/floors/generate', { societyId, towerId: selectedTower, count: floorCount }), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['floors'] }); setShowModal(false); toast.success(`${floorCount} floors generated!`); } });

  return (
    <div className="space-y-6">
      <PageHeader title="Floors" subtitle="Manage floors per tower"
        action={<button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2"><Plus className="w-4 h-4" /> Generate Floors</button>} />

      <div className="card p-4">
        <select value={selectedTower} onChange={(e) => setSelectedTower(e.target.value)} className="input">
          <option value="">Select a tower to view floors</option>
          {towers.map((t) => <option key={t._id} value={t._id}>{t.name}</option>)}
        </select>
      </div>

      {selectedTower && (
        isLoading ? <div className="card p-8 text-center text-slate-400">Loading...</div> : (
          <div className="card">
            {floors.length === 0 ? (
              <EmptyState icon={LayoutGrid} title="No floors yet" description="Generate floors for this tower"
                action={<button onClick={() => setShowModal(true)} className="btn-primary">Generate Floors</button>} />
            ) : (
              <div className="divide-y divide-slate-50">
                {floors.map((f) => (
                  <div key={f._id} className="flex items-center justify-between px-6 py-3 hover:bg-slate-50">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-primary-50 text-primary-600 rounded-lg flex items-center justify-center text-sm font-bold">{f.floorNumber}</div>
                      <p className="font-medium text-slate-700 text-sm">{f.floorName}</p>
                    </div>
                    <span className={`badge ${f.status === 'ACTIVE' ? 'badge-green' : 'badge-gray'}`}>{f.status}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      )}

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Generate Floors">
        <div className="space-y-4">
          <div><label className="label">Tower <span className="text-red-500">*</span></label>
            <select value={selectedTower} onChange={(e) => setSelectedTower(e.target.value)} className="input">
              <option value="">Select tower...</option>
              {towers.map((t) => <option key={t._id} value={t._id}>{t.name}</option>)}
            </select></div>
          <div><label className="label">Number of Floors</label>
            <input type="number" value={floorCount} onChange={(e) => setFloorCount(+e.target.value)} className="input" min={1} max={50} /></div>
          <div className="flex gap-3 pt-2">
            <button onClick={() => genMutation.mutate()} disabled={genMutation.isPending || !selectedTower} className="btn-primary flex-1">{genMutation.isPending ? 'Generating...' : 'Generate Floors'}</button>
            <button onClick={() => setShowModal(false)} className="btn-secondary">Cancel</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
