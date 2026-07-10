import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { LayoutGrid, Zap, Filter, Users, Car, PawPrint, Loader2, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api, extractData } from '../../services/api';
import { PageHeader } from '../../components/common/PageHeader';
import { EmptyState } from '../../components/common/EmptyState';
import { TableSkeleton } from '../../components/common/LoadingSkeleton';
import { Modal } from '../../components/common/Modal';
import { useAuthStore } from '../../store/authStore';
import { useSocietyStore } from '../../store/societyStore';
import { Flat, Tower, Floor } from '../../types';
import { cn } from '../../utils/cn';
import toast from 'react-hot-toast';

const FLAT_TYPES = ['1BHK', '2BHK', '3BHK', '4BHK', 'Studio', 'Penthouse', 'Shop', 'Office'];

const occupancyColors: Record<string, string> = {
  OWNER_OCCUPIED: 'badge-green',
  TENANT_OCCUPIED: 'badge-blue',
  VACANT: 'badge-gray',
  LOCKED: 'badge-yellow',
  UNDER_RENOVATION: 'badge-red',
};

export function FlatPage() {
  const { user } = useAuthStore();
  const { currentSociety } = useSocietyStore();
  const societyId = currentSociety?._id || user?.societyId || '';
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [page, setPage] = useState(1);
  const [filterTower, setFilterTower] = useState('');
  const [showGenModal, setShowGenModal] = useState(false);
  const [genTower, setGenTower] = useState('');
  const [genFloor, setGenFloor] = useState('');
  const [flatConfig, setFlatConfig] = useState({ flatsPerFloor: 4, flatType: '2BHK', areaSqFt: 850, startUnit: 1 });

  const { data, isLoading } = useQuery({
    queryKey: ['flats', societyId, page, filterTower],
    queryFn: () =>
      extractData<any>(
        api.get(`/flats/society/${societyId}?page=${page}&limit=30${filterTower ? `&towerId=${filterTower}` : ''}`)
      ),
    enabled: !!societyId,
  });

  const { data: towers = [] } = useQuery({
    queryKey: ['towers', societyId],
    queryFn: () => extractData<Tower[]>(api.get(`/towers/society/${societyId}`)),
    enabled: !!societyId,
  });

  const { data: floorsForGen = [] } = useQuery({
    queryKey: ['floors', genTower],
    queryFn: () => extractData<Floor[]>(api.get(`/floors/tower/${genTower}`)),
    enabled: !!genTower,
  });

  const genMutation = useMutation({
    mutationFn: async () => {
      const tower = towers.find((t) => t._id === genTower);
      if (!tower) return;
      const targetFloors = genFloor ? floorsForGen.filter((f) => f._id === genFloor) : floorsForGen;
      for (const floor of targetFloors) {
        await api.post('/flats/generate', {
          societyId,
          towerId: genTower,
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
      queryClient.invalidateQueries({ queryKey: ['flats'] });
      queryClient.invalidateQueries({ queryKey: ['towers'] });
      toast.success('Flats generated!');
      setShowGenModal(false);
    },
  });

  const flats: Flat[] = data?.items || [];
  const setFC = (k: string) => (v: any) => setFlatConfig((f) => ({ ...f, [k]: v }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Flats & Apartments"
        subtitle="View all flats · manage residents, vehicles & pets per flat"
        action={
          <button onClick={() => setShowGenModal(true)} className="btn-primary flex items-center gap-2">
            <Zap className="w-4 h-4" /> Generate Flats
          </button>
        }
      />

      {/* Filters */}
      <div className="card p-4 flex items-center gap-3 flex-wrap">
        <Filter className="w-4 h-4 text-slate-400 flex-shrink-0" />
        <select value={filterTower} onChange={(e) => { setFilterTower(e.target.value); setPage(1); }} className="input w-auto min-w-[160px] py-2 text-sm">
          <option value="">All Towers</option>
          {towers.map((t) => <option key={t._id} value={t._id}>{t.name}</option>)}
        </select>
        {filterTower && (
          <button onClick={() => { setFilterTower(''); setPage(1); }} className="text-xs text-slate-500 hover:text-slate-700 underline">Clear filter</button>
        )}
        <span className="ml-auto text-xs text-slate-500">{data?.total ?? 0} flats total</span>
      </div>

      {isLoading ? (
        <TableSkeleton rows={8} cols={6} />
      ) : (
        <div className="card overflow-hidden">
          {flats.length === 0 ? (
            <EmptyState
              icon={LayoutGrid}
              title="No flats yet"
              description="Generate flats from Towers page or use the Generate Flats button above"
              action={<button onClick={() => setShowGenModal(true)} className="btn-primary flex items-center gap-2"><Zap className="w-4 h-4" /> Generate Flats</button>}
            />
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-100">
                      <th className="table-header text-left">Flat No</th>
                      <th className="table-header text-left">Tower / Floor</th>
                      <th className="table-header text-left">Type</th>
                      <th className="table-header text-left">Area</th>
                      <th className="table-header text-left">Occupancy</th>
                      <th className="table-header text-left">Mapping</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {flats.map((f) => (
                      <tr key={f._id} className="table-row group">
                        <td className="table-cell font-mono font-semibold text-slate-800">{f.flatNo}</td>
                        <td className="table-cell text-sm text-slate-600">
                          <span>{(f.towerId as any)?.name || '—'}</span>
                          <span className="text-slate-400 mx-1">·</span>
                          <span className="text-slate-500">{(f.floorId as any)?.floorName || '—'}</span>
                        </td>
                        <td className="table-cell"><span className="badge badge-blue">{f.flatType}</span></td>
                        <td className="table-cell text-slate-600">{f.areaSqFt ? `${f.areaSqFt} sqft` : '—'}</td>
                        <td className="table-cell">
                          <span className={cn('badge text-xs', occupancyColors[f.occupancyStatus] || 'badge-gray')}>
                            {f.occupancyStatus.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="table-cell">
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => navigate('/residents')}
                              title="Manage residents for this flat"
                              className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors"
                            >
                              <Users className="w-3 h-3" /> Residents
                            </button>
                            <button
                              onClick={() => navigate('/vehicles')}
                              title="Manage vehicles"
                              className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors"
                            >
                              <Car className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => navigate('/pets')}
                              title="Manage pets"
                              className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg bg-amber-50 text-amber-700 hover:bg-amber-100 transition-colors"
                            >
                              <PawPrint className="w-3 h-3" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {/* Pagination */}
              {data?.totalPages > 1 && (
                <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100">
                  <p className="text-sm text-slate-500">Page {page} of {data.totalPages} ({data.total} flats)</p>
                  <div className="flex gap-2">
                    <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="btn-secondary text-sm py-1.5 px-3 disabled:opacity-50">Prev</button>
                    <button disabled={page >= data.totalPages} onClick={() => setPage((p) => p + 1)} className="btn-secondary text-sm py-1.5 px-3 disabled:opacity-50">Next</button>
                  </div>
                </div>
              )}

              {/* Quick links */}
              <div className="px-6 py-3 border-t border-slate-100 bg-slate-50 flex flex-wrap gap-3">
                <span className="text-xs text-slate-500 font-medium self-center">Quick links:</span>
                {[
                  { label: 'Residents', icon: Users, path: '/residents', color: 'text-emerald-600' },
                  { label: 'Vehicles', icon: Car, path: '/vehicles', color: 'text-blue-600' },
                  { label: 'Pets', icon: PawPrint, path: '/pets', color: 'text-amber-600' },
                ].map(({ label, icon: Icon, path, color }) => (
                  <button key={path} onClick={() => navigate(path)} className={`flex items-center gap-1.5 text-xs font-medium ${color} hover:underline`}>
                    <Icon className="w-3.5 h-3.5" /> {label} <ChevronRight className="w-3 h-3" />
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Generate Flats Modal */}
      <Modal isOpen={showGenModal} onClose={() => setShowGenModal(false)} title="Generate Flats">
        <div className="space-y-4">
          <div>
            <label className="label">Tower <span className="text-red-500">*</span></label>
            <select value={genTower} onChange={(e) => { setGenTower(e.target.value); setGenFloor(''); }} className="input">
              <option value="">Select tower...</option>
              {towers.map((t) => <option key={t._id} value={t._id}>{t.name}</option>)}
            </select>
          </div>
          {genTower && (
            <div>
              <label className="label">Floor <span className="text-slate-400 font-normal">(optional — leave blank for all floors)</span></label>
              <select value={genFloor} onChange={(e) => setGenFloor(e.target.value)} className="input">
                <option value="">All Floors ({floorsForGen.length})</option>
                {floorsForGen.map((f) => <option key={f._id} value={f._id}>{f.floorName}</option>)}
              </select>
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Flats per Floor</label>
              <input type="number" value={flatConfig.flatsPerFloor} onChange={(e) => setFC('flatsPerFloor')(+e.target.value)} className="input" min={1} max={50} />
            </div>
            <div>
              <label className="label">Starting Unit No.</label>
              <input type="number" value={flatConfig.startUnit} onChange={(e) => setFC('startUnit')(+e.target.value)} className="input" min={1} />
            </div>
            <div>
              <label className="label">Flat Type</label>
              <select value={flatConfig.flatType} onChange={(e) => setFC('flatType')(e.target.value)} className="input">
                {FLAT_TYPES.map((t) => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Area (sq ft)</label>
              <input type="number" value={flatConfig.areaSqFt} onChange={(e) => setFC('areaSqFt')(+e.target.value)} className="input" min={100} />
            </div>
          </div>
          {genTower && (
            <div className="p-3 bg-primary-50 rounded-xl text-sm text-primary-700">
              Will generate: <strong>{flatConfig.flatsPerFloor * (genFloor ? 1 : floorsForGen.length)}</strong> flats
              {!genFloor && ` across all ${floorsForGen.length} floors`}
            </div>
          )}
          <div className="flex gap-3 pt-1">
            <button onClick={() => genMutation.mutate()} disabled={genMutation.isPending || !genTower} className="btn-primary flex-1 flex items-center justify-center gap-2">
              {genMutation.isPending ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating...</> : <><Zap className="w-4 h-4" /> Generate Flats</>}
            </button>
            <button onClick={() => setShowGenModal(false)} className="btn-secondary">Cancel</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
