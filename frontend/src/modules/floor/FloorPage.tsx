import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { LayoutGrid, Layers3, ChevronRight, Zap, Loader2, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api, extractData } from '../../services/api';
import { PageHeader } from '../../components/common/PageHeader';
import { EmptyState } from '../../components/common/EmptyState';
import { Modal } from '../../components/common/Modal';
import { useAuthStore } from '../../store/authStore';
import { useSocietyStore } from '../../store/societyStore';
import { Tower, Floor } from '../../types';
import toast from 'react-hot-toast';

const FLAT_TYPES = ['1BHK', '2BHK', '3BHK', '4BHK', 'Studio', 'Penthouse', 'Shop', 'Office'];

export function FloorPage() {
  const { user } = useAuthStore();
  const { currentSociety } = useSocietyStore();
  const societyId = currentSociety?._id || user?.societyId || '';
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [selectedTowerId, setSelectedTowerId] = useState('');
  const [flatGenTarget, setFlatGenTarget] = useState<{ floor: Floor; tower: Tower } | null>(null);
  const [genAllTarget, setGenAllTarget] = useState<Tower | null>(null);
  const [flatConfig, setFlatConfig] = useState({ flatsPerFloor: 4, flatType: '2BHK', areaSqFt: 850, startUnit: 1 });

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

  const setFC = (k: string) => (v: any) => setFlatConfig((f) => ({ ...f, [k]: v }));
  const totalFlats = flatConfig.flatsPerFloor * floors.length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Floors"
        subtitle="Floors are auto-created from tower configuration — generate flats per floor here"
        action={
          selectedTower && floors.length > 0 ? (
            <button onClick={() => setGenAllTarget(selectedTower)} className="btn-primary flex items-center gap-2">
              <Zap className="w-4 h-4" /> Generate All Flats ({floors.length} floors)
            </button>
          ) : null
        }
      />

      {/* Tower selector tabs */}
      <div className="card p-4">
        {towers.length === 0 ? (
          <p className="text-sm text-slate-500">No towers yet — <button onClick={() => navigate('/towers')} className="text-primary-600 underline">create towers first</button></p>
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
        <EmptyState icon={LayoutGrid} title="Select a tower" description="Choose a tower above to view and manage its floors" />
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
                  <div className="w-9 h-9 bg-primary-50 text-primary-600 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0">
                    {floor.floorNumber}
                  </div>

                  {/* Floor name */}
                  <div className="flex-1">
                    <p className="font-medium text-slate-700 text-sm">{floor.floorName}</p>
                    <p className="text-xs text-slate-400">Floor {floor.floorNumber}</p>
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
          flatTypes={FLAT_TYPES}
          previewLabel={`${flatConfig.flatsPerFloor} flats on ${flatGenTarget?.floor.floorName}`}
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
          flatTypes={FLAT_TYPES}
          previewLabel={`${totalFlats} flats total (${flatConfig.flatsPerFloor} × ${floors.length} floors)`}
          isPending={genFlatsAll.isPending}
          onGenerate={() => genAllTarget && genFlatsAll.mutate(genAllTarget)}
          onCancel={() => setGenAllTarget(null)}
        />
      </Modal>
    </div>
  );
}

interface FlatConfigFormProps {
  config: { flatsPerFloor: number; flatType: string; areaSqFt: number; startUnit: number };
  setFC: (k: string) => (v: any) => void;
  flatTypes: string[];
  previewLabel: string;
  isPending: boolean;
  onGenerate: () => void;
  onCancel: () => void;
}

function FlatConfigForm({ config, setFC, flatTypes, previewLabel, isPending, onGenerate, onCancel }: FlatConfigFormProps) {
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
            {flatTypes.map((t) => <option key={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Area (sq ft)</label>
          <input type="number" value={config.areaSqFt} onChange={(e) => setFC('areaSqFt')(+e.target.value)} className="input" min={100} />
        </div>
      </div>
      <p className="text-xs text-slate-400 font-mono">Format: [TowerCode]-[Floor][Unit] e.g. A-101, A-102</p>
      <div className="flex gap-3 pt-1">
        <button onClick={onGenerate} disabled={isPending} className="btn-primary flex-1 flex items-center justify-center gap-2">
          {isPending ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating...</> : <><Zap className="w-4 h-4" /> Generate Flats</>}
        </button>
        <button onClick={onCancel} className="btn-secondary">Cancel</button>
      </div>
    </div>
  );
}
