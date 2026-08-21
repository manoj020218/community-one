import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { LayoutGrid, Layers3, ChevronRight, Zap, Loader2, Users, Pencil, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api, extractData } from '../../services/api';
import { PageHeader } from '../../components/common/PageHeader';
import { EmptyState } from '../../components/common/EmptyState';
import { Modal } from '../../components/common/Modal';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { useAuthStore } from '../../store/authStore';
import { useSocietyStore } from '../../store/societyStore';
import { Tower, Floor } from '../../types';
import { useTerminology } from '../../utils/terminology';
import toast from 'react-hot-toast';

// value must match the backend Flat.flatType enum exactly — label is just display text.
const FLAT_TYPE_OPTIONS = [
  { value: '1BHK', label: '1 BHK' }, { value: '2BHK', label: '2 BHK' }, { value: '3BHK', label: '3 BHK' }, { value: '4BHK', label: '4 BHK' },
  { value: 'PENTHOUSE', label: 'Penthouse' }, { value: 'VILLA', label: 'Villa' }, { value: 'SHOP', label: 'Shop' }, { value: 'OFFICE', label: 'Office' },
  { value: 'PARKING', label: 'Parking' }, { value: 'STAFF_QUARTERS', label: 'Staff Quarters' }, { value: 'OTHER', label: 'Other' },
];
const FLOOR_TYPE_LABEL: Record<string, string> = { GROUND: 'Ground', BASEMENT: 'Basement', TERRACE: 'Terrace', OTHER: 'Other' };

export function FloorPage() {
  const { user } = useAuthStore();
  const { currentSociety } = useSocietyStore();
  const societyId = currentSociety?._id || user?.societyId || '';
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const terms = useTerminology();

  const [selectedTowerId, setSelectedTowerId] = useState('');
  const [flatGenTarget, setFlatGenTarget] = useState<{ floor: Floor; tower: Tower } | null>(null);
  const [genAllTarget, setGenAllTarget] = useState<Tower | null>(null);
  const [flatConfig, setFlatConfig] = useState({ flatsPerFloor: 4, flatType: '2BHK', areaSqFt: 850, startUnit: 1 });

  const [editTarget, setEditTarget] = useState<Floor | null>(null);
  const [editName, setEditName] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<Floor | null>(null);

  const { data: towers = [] } = useQuery({
    queryKey: ['towers', societyId],
    queryFn: () => extractData<Tower[]>(api.get(`/towers/society/${societyId}`)),
    enabled: !!societyId,
  });

  const selectedTower = towers.find((t) => t._id === selectedTowerId) ?? null;

  const { data: floors = [], isLoading: floorsLoading } = useQuery({
    queryKey: ['floors', selectedTowerId],
    queryFn: () => extractData<Floor[]>(api.get(`/floors/tower/${selectedTowerId}`)),
    enabled: !!selectedTowerId,
  });

  const genFlatsFloor = useMutation({
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
      toast.success('Flats generated!');
      setFlatGenTarget(null);
    },
  });

  const genFlatsAll = useMutation({
    mutationFn: async (tower: Tower) => {
      for (const floor of floors) {
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
      toast.success(`Flats generated for all ${floors.length} floors!`);
      setGenAllTarget(null);
    },
  });

  const editMutation = useMutation({
    mutationFn: ({ id, floorName }: { id: string; floorName: string }) => api.patch(`/floors/${id}`, { floorName }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['floors'] });
      setEditTarget(null);
      toast.success('Floor updated!');
    },
  });

  // Backend blocks this with a 409 + clear message ("still has N flat(s), delete those
  // first") whenever the floor isn't empty — the global axios interceptor already surfaces
  // that as a toast, so no local error handling needed here.
  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/floors/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['floors'] });
      queryClient.invalidateQueries({ queryKey: ['towers'] });
      setDeleteTarget(null);
      toast.success('Floor deleted');
    },
  });

  const setFC = (k: string) => (v: any) => setFlatConfig((f) => ({ ...f, [k]: v }));
  const totalFlats = flatConfig.flatsPerFloor * floors.length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Floors"
        subtitle={`Floors are auto-created from ${terms.building.toLowerCase()} configuration — generate ${terms.unit.toLowerCase()}s per floor here`}
        action={
          selectedTower && floors.length > 0 ? (
            <button onClick={() => setGenAllTarget(selectedTower)} className="btn-primary flex items-center gap-2">
              <Zap className="w-4 h-4" /> Generate All {terms.unitPlural} ({floors.length} floors)
            </button>
          ) : null
        }
      />

      {/* Tower selector tabs */}
      <div className="card p-4">
        {towers.length === 0 ? (
          <p className="text-sm text-slate-500">No {terms.buildingPlural.toLowerCase()} yet — <button onClick={() => navigate('/towers')} className="text-primary-600 underline">create {terms.building.toLowerCase()}s first</button></p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {towers.map((t) => (
              <button
                key={t._id}
                onClick={() => setSelectedTowerId(t._id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  selectedTowerId === t._id
                    ? 'bg-primary-600 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <Layers3 className="w-3.5 h-3.5" />
                {t.name}
                <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${selectedTowerId === t._id ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-500'}`}>
                  {t.numberOfFloors}F
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Floor list */}
      {!selectedTowerId ? (
        <EmptyState icon={LayoutGrid} title={`Select a ${terms.building.toLowerCase()}`} description={`Choose a ${terms.building.toLowerCase()} above to view and manage its floors`} />
      ) : floorsLoading ? (
        <div className="card p-8 text-center text-slate-400">Loading floors...</div>
      ) : floors.length === 0 ? (
        <div className="card p-8 text-center">
          <p className="text-slate-500 mb-3">No floors found for this tower.</p>
          <button onClick={() => navigate('/towers')} className="btn-secondary text-sm">Go to Towers to regenerate</button>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="px-6 py-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-slate-800">{selectedTower?.name}</h3>
              <p className="text-xs text-slate-500">{floors.length} floors · {selectedTower?.totalFlats || 0} flats generated</p>
            </div>
            <button onClick={() => navigate('/flats')} className="flex items-center gap-1.5 text-xs text-primary-600 hover:text-primary-700 font-medium">
              View All Flats <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="divide-y divide-slate-50">
            {floors.map((floor) => {
              const flatCount = (floor as any).totalFlats ?? 0;
              return (
                <div key={floor._id} className="flex items-center gap-4 px-6 py-3 hover:bg-slate-50 transition-colors group">
                  {/* Floor badge */}
                  <div className="w-9 h-9 bg-primary-50 text-primary-600 rounded-xl flex items-center justify-center text-xs font-bold flex-shrink-0">
                    {floor.flatNumberPrefix || floor.floorNumber}
                  </div>

                  {/* Floor name */}
                  <div className="flex-1">
                    <p className="font-medium text-slate-700 text-sm">{floor.floorName}</p>
                    <p className="text-xs text-slate-400">
                      {floor.floorType && floor.floorType !== 'TYPICAL' ? FLOOR_TYPE_LABEL[floor.floorType] || floor.floorType : `Floor ${floor.floorNumber}`}
                    </p>
                  </div>

                  {/* Flat count or generate button */}
                  {flatCount > 0 ? (
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1.5 text-sm text-emerald-600 font-medium">
                        <LayoutGrid className="w-4 h-4" />
                        {flatCount} flats
                      </div>
                      <button
                        onClick={() => navigate('/flats')}
                        className="opacity-0 group-hover:opacity-100 flex items-center gap-1 text-xs text-slate-500 hover:text-primary-600 transition-all"
                      >
                        <Users className="w-3.5 h-3.5" /> Manage
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => selectedTower && setFlatGenTarget({ floor, tower: selectedTower })}
                      className="flex items-center gap-1.5 text-xs font-medium text-primary-600 bg-primary-50 hover:bg-primary-100 px-3 py-1.5 rounded-lg transition-colors"
                    >
                      <Zap className="w-3.5 h-3.5" /> Generate Flats
                    </button>
                  )}

                  <span className={`badge ml-1 ${floor.status === 'ACTIVE' ? 'badge-green' : 'badge-gray'}`}>{floor.status}</span>

                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => { setEditTarget(floor); setEditName(floor.floorName); }}
                      title="Edit floor name"
                      className="p-1.5 rounded-lg text-slate-400 hover:bg-primary-50 hover:text-primary-600 transition-colors"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setDeleteTarget(floor)}
                      title="Delete floor"
                      className="p-1.5 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer summary */}
          <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
            <p className="text-xs text-slate-500">
              {floors.filter((f) => ((f as any).totalFlats ?? 0) > 0).length} of {floors.length} floors have flats generated
            </p>
            <button
              onClick={() => selectedTower && setGenAllTarget(selectedTower)}
              className="flex items-center gap-1.5 text-xs font-medium text-primary-600 hover:text-primary-700 transition-colors"
            >
              <Zap className="w-3.5 h-3.5" /> Generate flats for all remaining floors
            </button>
          </div>
        </div>
      )}

      {/* Generate Flats Modal — single floor */}
      <Modal isOpen={!!flatGenTarget} onClose={() => setFlatGenTarget(null)} title={`Generate Flats — ${flatGenTarget?.floor.floorName}`}>
        <FlatConfigForm
          config={flatConfig}
          setFC={setFC}
          flatTypes={FLAT_TYPE_OPTIONS}
          previewLabel={`${flatConfig.flatsPerFloor} flats on ${flatGenTarget?.floor.floorName}`}
          flatNumberPrefix={flatGenTarget?.floor.flatNumberPrefix || `${(flatGenTarget?.tower.name || '').split(' ').pop()}-${flatGenTarget?.floor.floorNumber}`}
          isPending={genFlatsFloor.isPending}
          onGenerate={() => flatGenTarget && genFlatsFloor.mutate(flatGenTarget)}
          onCancel={() => setFlatGenTarget(null)}
        />
      </Modal>

      {/* Generate Flats Modal — all floors */}
      <Modal isOpen={!!genAllTarget} onClose={() => setGenAllTarget(null)} title={`Generate Flats — All Floors of ${genAllTarget?.name}`}>
        <FlatConfigForm
          config={flatConfig}
          setFC={setFC}
          flatTypes={FLAT_TYPE_OPTIONS}
          previewLabel={`${totalFlats} flats total (${flatConfig.flatsPerFloor} × ${floors.length} floors)`}
          flatNumberPrefix={floors[0]?.flatNumberPrefix || String(floors[0]?.floorNumber ?? '')}
          multiFloor
          isPending={genFlatsAll.isPending}
          onGenerate={() => genAllTarget && genFlatsAll.mutate(genAllTarget)}
          onCancel={() => setGenAllTarget(null)}
        />
      </Modal>

      {/* Edit Floor Name Modal */}
      <Modal isOpen={!!editTarget} onClose={() => setEditTarget(null)} title="Edit Floor">
        <div className="space-y-4">
          <div>
            <label className="label">Floor Name</label>
            <input value={editName} onChange={(e) => setEditName(e.target.value)} className="input" placeholder="e.g. Ground Floor, Floor 1" />
          </div>
          <p className="text-xs text-slate-400">The floor number and flat-number prefix can't be changed here to avoid mismatching existing flat numbers.</p>
          <div className="flex gap-3 pt-1">
            <button
              onClick={() => editTarget && editMutation.mutate({ id: editTarget._id, floorName: editName })}
              disabled={editMutation.isPending || !editName.trim()}
              className="btn-primary flex-1"
            >
              {editMutation.isPending ? 'Saving...' : 'Save Changes'}
            </button>
            <button onClick={() => setEditTarget(null)} className="btn-secondary">Cancel</button>
          </div>
        </div>
      </Modal>

      {/* Delete Floor Confirm */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        title={`Delete ${deleteTarget?.floorName}?`}
        message={
          <>
            This permanently removes <strong>{deleteTarget?.floorName}</strong>. If it still has {terms.unitPlural.toLowerCase()},
            deletion will be blocked — delete its {terms.unitPlural.toLowerCase()} first.
          </>
        }
        confirmLabel="Delete Floor"
        isPending={deleteMutation.isPending}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget._id)}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}

interface FlatConfigFormProps {
  config: { flatsPerFloor: number; flatType: string; areaSqFt: number; startUnit: number };
  setFC: (k: string) => (v: any) => void;
  flatTypes: { value: string; label: string }[];
  previewLabel: string;
  flatNumberPrefix: string;
  multiFloor?: boolean;
  isPending: boolean;
  onGenerate: () => void;
  onCancel: () => void;
}

function FlatConfigForm({ config, setFC, flatTypes, previewLabel, flatNumberPrefix, multiFloor, isPending, onGenerate, onCancel }: FlatConfigFormProps) {
  return (
    <div className="space-y-4">
      <div className="p-3 bg-primary-50 rounded-xl text-sm text-primary-700">
        Will generate: <span className="font-semibold">{previewLabel}</span>
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
            {flatTypes.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Area (sq ft)</label>
          <input type="number" value={config.areaSqFt} onChange={(e) => setFC('areaSqFt')(+e.target.value)} className="input" min={100} />
        </div>
      </div>
      <p className="text-xs text-slate-400 font-mono">
        Flat numbers: {flatNumberPrefix}{config.startUnit.toString().padStart(2, '0')}, {flatNumberPrefix}{(config.startUnit + 1).toString().padStart(2, '0')} ...
        {multiFloor && ' (prefix changes per floor — G/B1 for ground/basement, 1/2/3... for typical floors)'}
      </p>
      <div className="flex gap-3 pt-1">
        <button onClick={onGenerate} disabled={isPending} className="btn-primary flex-1 flex items-center justify-center gap-2">
          {isPending ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating...</> : <><Zap className="w-4 h-4" /> Generate Flats</>}
        </button>
        <button onClick={onCancel} className="btn-secondary">Cancel</button>
      </div>
    </div>
  );
}
