import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Layers3, Building2, ChevronDown, ChevronRight, Zap, LayoutGrid, CheckCircle2, Loader2 } from 'lucide-react';
import { api, extractData } from '../../services/api';
import { PageHeader } from '../../components/common/PageHeader';
import { EmptyState } from '../../components/common/EmptyState';
import { Modal } from '../../components/common/Modal';
import { VoiceInputField } from '../../components/common/VoiceInputField';
import { useAuthStore } from '../../store/authStore';
import { useSocietyStore } from '../../store/societyStore';
import { Tower, Floor } from '../../types';
import toast from 'react-hot-toast';
import { cn } from '../../utils/cn';

const TOWER_TYPES = ['TOWER', 'BLOCK', 'VILLA_ROW', 'SHOP_BLOCK', 'OTHER'];
const FLAT_TYPES = ['1BHK', '2BHK', '3BHK', '4BHK', 'Studio', 'Penthouse', 'Shop', 'Office'];

async function autoGenerateFloors(societyId: string, towerId: string, count: number) {
  await api.post('/floors/generate', { societyId, towerId, count });
}

export function TowerPage() {
  const { user } = useAuthStore();
  const { currentSociety } = useSocietyStore();
  const societyId = currentSociety?._id || user?.societyId || '';
  const queryClient = useQueryClient();

  const [showAddModal, setShowAddModal] = useState(false);
  const [form, setForm] = useState({ name: '', type: 'TOWER', numberOfFloors: 10, hasLift: false });
  const [genCount, setGenCount] = useState(3);
  const [expandedTower, setExpandedTower] = useState<Tower | null>(null);

  // Flat generation state
  const [flatGenFloor, setFlatGenFloor] = useState<Floor | null>(null);
  const [flatGenAllTower, setFlatGenAllTower] = useState<Tower | null>(null);
  const [flatConfig, setFlatConfig] = useState({ flatsPerFloor: 4, flatType: '2BHK', areaSqFt: 850, startUnit: 1 });

  const { data: towers = [], isLoading } = useQuery({
    queryKey: ['towers', societyId],
    queryFn: () => extractData<Tower[]>(api.get(`/towers/society/${societyId}`)),
    enabled: !!societyId,
  });

  const { data: expandedFloors = [], isFetching: floorsLoading } = useQuery({
    queryKey: ['floors', expandedTower?._id],
    queryFn: () => extractData<Floor[]>(api.get(`/floors/tower/${expandedTower!._id}`)),
    enabled: !!expandedTower?._id,
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof form) => {
      const res = await api.post('/towers', { ...data, societyId });
      const tower = res.data.data;
      await autoGenerateFloors(societyId, tower._id, data.numberOfFloors);
      return tower;
    },
    onSuccess: (tower) => {
      queryClient.invalidateQueries({ queryKey: ['towers'] });
      queryClient.invalidateQueries({ queryKey: ['floors'] });
      setShowAddModal(false);
      setForm({ name: '', type: 'TOWER', numberOfFloors: 10, hasLift: false });
      toast.success(`Tower created with ${tower.numberOfFloors} floors!`);
      setExpandedTower(tower);
    },
  });

  const genMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post('/towers/generate', { societyId, count: genCount });
      const generated: Tower[] = res.data.data;
      await Promise.all(generated.map((t) => autoGenerateFloors(societyId, t._id, t.numberOfFloors)));
      return generated;
    },
    onSuccess: (generated) => {
      queryClient.invalidateQueries({ queryKey: ['towers'] });
      queryClient.invalidateQueries({ queryKey: ['floors'] });
      toast.success(`${generated.length} towers created with floors!`);
      if (generated[0]) setExpandedTower(generated[0]);
    },
  });

  const genFlatsForFloor = useMutation({
    mutationFn: async ({ floor, tower }: { floor: Floor; tower: Tower }) => {
      await api.post('/flats/generate', {
        societyId,
        towerId: tower._id,
        floorId: floor._id,
        floorNumber: floor.floorNumber,
        towerCode: tower.name.split(' ').pop() || tower.name,
        flatsPerFloor: flatConfig.flatsPerFloor,
        flatType: flatConfig.flatType,
        startUnit: flatConfig.startUnit,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['floors'] });
      queryClient.invalidateQueries({ queryKey: ['flats'] });
      queryClient.invalidateQueries({ queryKey: ['towers'] });
      toast.success(`Flats generated for ${flatGenFloor?.floorName}!`);
      setFlatGenFloor(null);
    },
  });

  const genFlatsAllFloors = useMutation({
    mutationFn: async (tower: Tower) => {
      for (const floor of expandedFloors) {
        await api.post('/flats/generate', {
          societyId,
          towerId: tower._id,
          floorId: floor._id,
          floorNumber: floor.floorNumber,
          towerCode: tower.name.split(' ').pop() || tower.name,
          flatsPerFloor: flatConfig.flatsPerFloor,
          flatType: flatConfig.flatType,
          startUnit: flatConfig.startUnit,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['floors'] });
      queryClient.invalidateQueries({ queryKey: ['flats'] });
      queryClient.invalidateQueries({ queryKey: ['towers'] });
      toast.success(`Flats generated for all ${expandedFloors.length} floors!`);
      setFlatGenAllTower(null);
    },
  });

  const setF = (k: string) => (v: any) => setForm((f) => ({ ...f, [k]: v }));
  const setFC = (k: string) => (v: any) => setFlatConfig((f) => ({ ...f, [k]: v }));

  const totalExpectedFlats = flatConfig.flatsPerFloor * expandedFloors.length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Towers & Blocks"
        subtitle="Create towers — floors are auto-generated, then configure flats per floor"
        action={
          <div className="flex items-center gap-2">
            <button onClick={() => genMutation.mutate()} disabled={genMutation.isPending} className="btn-secondary text-sm flex items-center gap-1.5">
              {genMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Building2 className="w-4 h-4" />}
              Generate {genCount}
            </button>
            <input type="number" value={genCount} onChange={(e) => setGenCount(+e.target.value)} className="w-16 input text-sm py-2" min={1} max={12} />
            <button onClick={() => setShowAddModal(true)} className="btn-primary flex items-center gap-2">
              <Plus className="w-4 h-4" /> Add Tower
            </button>
          </div>
        }
      />

      {isLoading ? (
        <div className="card p-8 text-center text-slate-400">Loading towers...</div>
      ) : towers.length === 0 ? (
        <EmptyState icon={Layers3} title="No towers yet" description="Add a tower — floors are auto-generated from the floor count you set"
          action={<button onClick={() => setShowAddModal(true)} className="btn-primary">Add First Tower</button>} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {towers.map((t) => {
            const isExpanded = expandedTower?._id === t._id;
            return (
              <div key={t._id} className={cn('card transition-all cursor-pointer', isExpanded ? 'ring-2 ring-primary-400 shadow-lg' : 'hover:shadow-md')}>
                {/* Tower header */}
                <div className="p-5" onClick={() => setExpandedTower(isExpanded ? null : t)}>
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center flex-shrink-0">
                      <Layers3 className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-slate-800 truncate">{t.name}</h3>
                      <p className="text-xs text-slate-500">{t.type.replace(/_/g, ' ')}</p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className={`badge ${t.status === 'ACTIVE' ? 'badge-green' : 'badge-gray'}`}>{t.status}</span>
                      {isExpanded ? <ChevronDown className="w-4 h-4 text-primary-500" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="bg-slate-50 rounded-xl p-2">
                      <p className="text-lg font-bold text-slate-800">{t.numberOfFloors}</p>
                      <p className="text-xs text-slate-500">Floors</p>
                    </div>
                    <div className="bg-slate-50 rounded-xl p-2">
                      <p className="text-lg font-bold text-slate-800">{t.totalFlats || 0}</p>
                      <p className="text-xs text-slate-500">Flats</p>
                    </div>
                    <div className="bg-slate-50 rounded-xl p-2">
                      <p className="text-lg font-bold text-slate-800">{t.hasLift ? 'Yes' : 'No'}</p>
                      <p className="text-xs text-slate-500">Lift</p>
                    </div>
                  </div>
                </div>

                {/* Expanded floor panel */}
                {isExpanded && (
                  <div className="border-t border-slate-100">
                    <div className="px-5 py-3 bg-slate-50 flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                        {floorsLoading ? 'Loading floors...' : `${expandedFloors.length} Floors`}
                      </span>
                      {expandedFloors.length > 0 && (
                        <button
                          onClick={(e) => { e.stopPropagation(); setFlatGenAllTower(t); }}
                          className="flex items-center gap-1 text-xs font-medium text-primary-600 hover:text-primary-700 bg-primary-50 hover:bg-primary-100 px-2.5 py-1 rounded-lg transition-colors"
                        >
                          <Zap className="w-3.5 h-3.5" /> Generate All Flats
                        </button>
                      )}
                    </div>
                    <div className="divide-y divide-slate-50 max-h-56 overflow-y-auto">
                      {floorsLoading ? (
                        <div className="p-4 text-center text-slate-400 text-sm">Loading...</div>
                      ) : expandedFloors.length === 0 ? (
                        <div className="p-4 text-center text-slate-400 text-sm">No floors found</div>
                      ) : (
                        expandedFloors.map((floor) => (
                          <div key={floor._id} className="flex items-center gap-3 px-5 py-2.5" onClick={(e) => e.stopPropagation()}>
                            <div className="w-7 h-7 bg-primary-50 text-primary-600 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0">
                              {floor.floorNumber}
                            </div>
                            <span className="text-sm text-slate-700 flex-1">{floor.floorName}</span>
                            {(floor as any).totalFlats > 0 ? (
                              <div className="flex items-center gap-1 text-xs text-emerald-600 font-medium">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                {(floor as any).totalFlats} flats
                              </div>
                            ) : (
                              <button
                                onClick={() => { setFlatGenFloor(floor); setFlatGenAllTower(null); }}
                                className="flex items-center gap-1 text-xs font-medium text-primary-600 hover:text-primary-700 bg-primary-50 hover:bg-primary-100 px-2 py-1 rounded-lg transition-colors"
                              >
                                <LayoutGrid className="w-3 h-3" /> Gen Flats
                              </button>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Add Tower Modal */}
      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Add Tower / Block">
        <div className="space-y-4">
          <VoiceInputField label="Tower Name" value={form.name} onChange={(v) => setF('name')(v)} placeholder="Tower A" required />
          <div>
            <label className="label">Type</label>
            <select value={form.type} onChange={(e) => setF('type')(e.target.value)} className="input">
              {TOWER_TYPES.map((t) => <option key={t}>{t.replace(/_/g, ' ')}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Number of Floors</label>
            <input type="number" value={form.numberOfFloors} onChange={(e) => setF('numberOfFloors')(+e.target.value)} className="input" min={1} max={99} />
            <p className="text-xs text-slate-400 mt-1">Floors 1–{form.numberOfFloors} will be auto-created</p>
          </div>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={form.hasLift} onChange={(e) => setF('hasLift')(e.target.checked)} className="w-4 h-4 text-primary-600 rounded" />
            Has Lift / Elevator
          </label>
          <div className="flex gap-3 pt-2">
            <button onClick={() => createMutation.mutate(form)} disabled={createMutation.isPending || !form.name} className="btn-primary flex-1 flex items-center justify-center gap-2">
              {createMutation.isPending ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating...</> : 'Create Tower + Auto-Generate Floors'}
            </button>
            <button onClick={() => setShowAddModal(false)} className="btn-secondary">Cancel</button>
          </div>
        </div>
      </Modal>

      {/* Generate Flats Modal — single floor */}
      <Modal isOpen={!!flatGenFloor} onClose={() => setFlatGenFloor(null)} title={`Generate Flats — ${flatGenFloor?.floorName}`}>
        <FlatGenForm
          config={flatConfig}
          setFC={setFC}
          flatTypes={FLAT_TYPES}
          scope={`Floor ${flatGenFloor?.floorNumber}`}
          preview={`${flatConfig.flatsPerFloor} flats`}
          isPending={genFlatsForFloor.isPending}
          onGenerate={() => expandedTower && flatGenFloor && genFlatsForFloor.mutate({ floor: flatGenFloor, tower: expandedTower })}
          onCancel={() => setFlatGenFloor(null)}
        />
      </Modal>

      {/* Generate Flats Modal — all floors of a tower */}
      <Modal isOpen={!!flatGenAllTower} onClose={() => setFlatGenAllTower(null)} title={`Generate Flats — All ${expandedFloors.length} Floors of ${flatGenAllTower?.name}`}>
        <FlatGenForm
          config={flatConfig}
          setFC={setFC}
          flatTypes={FLAT_TYPES}
          scope={`All ${expandedFloors.length} floors`}
          preview={`${totalExpectedFlats} flats total (${flatConfig.flatsPerFloor} × ${expandedFloors.length} floors)`}
          isPending={genFlatsAllFloors.isPending}
          onGenerate={() => flatGenAllTower && genFlatsAllFloors.mutate(flatGenAllTower)}
          onCancel={() => setFlatGenAllTower(null)}
        />
      </Modal>
    </div>
  );
}

interface FlatGenFormProps {
  config: { flatsPerFloor: number; flatType: string; areaSqFt: number; startUnit: number };
  setFC: (k: string) => (v: any) => void;
  flatTypes: string[];
  scope: string;
  preview: string;
  isPending: boolean;
  onGenerate: () => void;
  onCancel: () => void;
}

function FlatGenForm({ config, setFC, flatTypes, scope, preview, isPending, onGenerate, onCancel }: FlatGenFormProps) {
  return (
    <div className="space-y-4">
      <div className="p-3 bg-primary-50 rounded-xl text-sm text-primary-700 font-medium">
        Generating for: <span className="font-semibold">{scope}</span> → <span className="font-semibold">{preview}</span>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Flats per Floor</label>
          <input type="number" value={config.flatsPerFloor} onChange={(e) => setFC('flatsPerFloor')(+e.target.value)} className="input" min={1} max={50} />
        </div>
        <div>
          <label className="label">Starting Unit No.</label>
          <input type="number" value={config.startUnit} onChange={(e) => setFC('startUnit')(+e.target.value)} className="input" min={1} />
        </div>
        <div>
          <label className="label">Flat Type</label>
          <select value={config.flatType} onChange={(e) => setFC('flatType')(e.target.value)} className="input">
            {flatTypes.map((t) => <option key={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Area (sq ft)</label>
          <input type="number" value={config.areaSqFt} onChange={(e) => setFC('areaSqFt')(+e.target.value)} className="input" min={100} />
        </div>
      </div>
      <div className="p-3 bg-slate-50 rounded-xl text-xs text-slate-500 font-mono">
        Flat numbers: A-101, A-102 ... A-{config.flatsPerFloor.toString().padStart(2, '0')} (tower code + floor + unit)
      </div>
      <div className="flex gap-3 pt-1">
        <button onClick={onGenerate} disabled={isPending} className="btn-primary flex-1 flex items-center justify-center gap-2">
          {isPending ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating...</> : <><Zap className="w-4 h-4" /> Generate Flats</>}
        </button>
        <button onClick={onCancel} className="btn-secondary">Cancel</button>
      </div>
    </div>
  );
}
