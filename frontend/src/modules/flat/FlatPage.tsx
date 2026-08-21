import { Fragment, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { LayoutGrid, Zap, Filter, Users, Car, PawPrint, Loader2, ChevronRight, ChevronDown, BedDouble, Wrench, UserX, Pencil, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api, extractData } from '../../services/api';
import { PageHeader } from '../../components/common/PageHeader';
import { EmptyState } from '../../components/common/EmptyState';
import { TableSkeleton } from '../../components/common/LoadingSkeleton';
import { Modal } from '../../components/common/Modal';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { BedAssignModal } from './BedAssignModal';
import { useAuthStore } from '../../store/authStore';
import { useSocietyStore } from '../../store/societyStore';
import { Flat, Tower, Floor, Bed } from '../../types';
import { cn } from '../../utils/cn';
import { useTerminology } from '../../utils/terminology';
import toast from 'react-hot-toast';

// value must match the backend Flat.flatType enum exactly — label is just display text.
const FLAT_TYPE_OPTIONS = [
  { value: '1BHK', label: '1 BHK' }, { value: '2BHK', label: '2 BHK' }, { value: '3BHK', label: '3 BHK' }, { value: '4BHK', label: '4 BHK' },
  { value: 'PENTHOUSE', label: 'Penthouse' }, { value: 'VILLA', label: 'Villa' }, { value: 'SHOP', label: 'Shop' }, { value: 'OFFICE', label: 'Office' },
  { value: 'PARKING', label: 'Parking' }, { value: 'STAFF_QUARTERS', label: 'Staff Quarters' }, { value: 'OTHER', label: 'Other' },
];

const occupancyColors: Record<string, string> = {
  OWNER_OCCUPIED: 'badge-green',
  TENANT_OCCUPIED: 'badge-blue',
  VACANT: 'badge-gray',
  LOCKED: 'badge-yellow',
  UNDER_RENOVATION: 'badge-red',
};

const bedStatusColors: Record<string, string> = {
  OCCUPIED: 'badge-blue',
  VACANT: 'badge-gray',
  MAINTENANCE: 'badge-yellow',
  RESERVED: 'badge-green',
};

export function FlatPage() {
  const { user } = useAuthStore();
  const { currentSociety } = useSocietyStore();
  const societyId = currentSociety?._id || user?.societyId || '';
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const terms = useTerminology();

  const [page, setPage] = useState(1);
  const [filterTower, setFilterTower] = useState('');
  const [showGenModal, setShowGenModal] = useState(false);
  const [genTower, setGenTower] = useState('');
  const [genFloor, setGenFloor] = useState('');
  const [flatConfig, setFlatConfig] = useState({ flatsPerFloor: 4, flatType: '2BHK', areaSqFt: 850, startUnit: 1 });
  const [expandedFlatId, setExpandedFlatId] = useState<string | null>(null);
  const isHostel = terms.unit === 'Room';

  const [editTarget, setEditTarget] = useState<Flat | null>(null);
  const [editForm, setEditForm] = useState({ flatNo: '', flatType: '2BHK', areaSqFt: '' as number | '', occupancyStatus: 'VACANT' });
  const [deleteTarget, setDeleteTarget] = useState<Flat | null>(null);

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

  const editMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: any }) => api.patch(`/flats/${id}`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['flats'] });
      setEditTarget(null);
      toast.success(`${terms.unit} updated!`);
    },
  });

  // Backend blocks this with a 409 + clear message ("still has N resident(s)/vehicle(s)/...")
  // whenever the flat isn't empty — the global axios interceptor surfaces that as a toast, so
  // no local error handling is needed here.
  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/flats/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['flats'] });
      queryClient.invalidateQueries({ queryKey: ['floors'] });
      queryClient.invalidateQueries({ queryKey: ['towers'] });
      setDeleteTarget(null);
      toast.success(`${terms.unit} deleted`);
    },
  });

  const flats: Flat[] = data?.items || [];
  const setFC = (k: string) => (v: any) => setFlatConfig((f) => ({ ...f, [k]: v }));

  return (
    <div className="space-y-6">
      <PageHeader
        title={terms.unitPlural}
        subtitle={`View all ${terms.unit.toLowerCase()}s · manage ${terms.person.toLowerCase()}s, vehicles & pets per ${terms.unit.toLowerCase()}`}
        action={
          <button onClick={() => setShowGenModal(true)} className="btn-primary flex items-center gap-2">
            <Zap className="w-4 h-4" /> Generate {terms.unitPlural}
          </button>
        }
      />

      {/* Filters */}
      <div className="card p-4 flex items-center gap-3 flex-wrap">
        <Filter className="w-4 h-4 text-slate-400 flex-shrink-0" />
        <select value={filterTower} onChange={(e) => { setFilterTower(e.target.value); setPage(1); }} className="input w-auto min-w-[160px] py-2 text-sm">
          <option value="">All {terms.buildingPlural}</option>
          {towers.map((t) => <option key={t._id} value={t._id}>{t.name}</option>)}
        </select>
        {filterTower && (
          <button onClick={() => { setFilterTower(''); setPage(1); }} className="text-xs text-slate-500 hover:text-slate-700 underline">Clear filter</button>
        )}
        <span className="ml-auto text-xs text-slate-500">{data?.total ?? 0} {terms.unit.toLowerCase()}s total</span>
      </div>

      {isLoading ? (
        <TableSkeleton rows={8} cols={6} />
      ) : (
        <div className="card overflow-hidden">
          {flats.length === 0 ? (
            <EmptyState
              icon={LayoutGrid}
              title={`No ${terms.unit.toLowerCase()}s yet`}
              description={`Generate ${terms.unit.toLowerCase()}s from the ${terms.buildingPlural} page or use the button above`}
              action={<button onClick={() => setShowGenModal(true)} className="btn-primary flex items-center gap-2"><Zap className="w-4 h-4" /> Generate {terms.unitPlural}</button>}
            />
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-100">
                      {isHostel && <th className="table-header w-8"></th>}
                      <th className="table-header text-left">{terms.unit} No</th>
                      <th className="table-header text-left">Tower / Floor</th>
                      <th className="table-header text-left">Type</th>
                      <th className="table-header text-left">Area</th>
                      <th className="table-header text-left">Occupancy</th>
                      <th className="table-header text-left">Mapping</th>
                      <th className="table-header text-left">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {flats.map((f) => {
                      const isExpanded = expandedFlatId === f._id;
                      return (
                        <Fragment key={f._id}>
                          <tr className="table-row group">
                            {isHostel && (
                              <td className="table-cell">
                                <button onClick={() => setExpandedFlatId(isExpanded ? null : f._id)} className="text-slate-400 hover:text-primary-600" title="Show beds">
                                  {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                                </button>
                              </td>
                            )}
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
                                  title={`Manage ${terms.person.toLowerCase()}s for this ${terms.unit.toLowerCase()}`}
                                  className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors"
                                >
                                  <Users className="w-3 h-3" /> {terms.personPlural}
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
                            <td className="table-cell">
                              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                  onClick={() => { setEditTarget(f); setEditForm({ flatNo: f.flatNo, flatType: f.flatType, areaSqFt: f.areaSqFt ?? '', occupancyStatus: f.occupancyStatus }); }}
                                  title={`Edit ${terms.unit.toLowerCase()}`}
                                  className="p-1.5 rounded-lg text-slate-400 hover:bg-primary-50 hover:text-primary-600 transition-colors"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => setDeleteTarget(f)}
                                  title={`Delete ${terms.unit.toLowerCase()}`}
                                  className="p-1.5 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                          {isHostel && isExpanded && (
                            <tr>
                              <td colSpan={8} className="p-0 bg-slate-50 border-b border-slate-100">
                                <BedsPanel flatId={f._id} societyId={societyId} />
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      );
                    })}
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
                {FLAT_TYPE_OPTIONS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
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

      {/* Edit Flat Modal */}
      <Modal isOpen={!!editTarget} onClose={() => setEditTarget(null)} title={`Edit ${terms.unit}`}>
        <div className="space-y-4">
          <div>
            <label className="label">{terms.unit} No</label>
            <input value={editForm.flatNo} onChange={(e) => setEditForm((f) => ({ ...f, flatNo: e.target.value }))} className="input" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Type</label>
              <select value={editForm.flatType} onChange={(e) => setEditForm((f) => ({ ...f, flatType: e.target.value }))} className="input">
                {FLAT_TYPE_OPTIONS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Area (sq ft)</label>
              <input type="number" value={editForm.areaSqFt} onChange={(e) => setEditForm((f) => ({ ...f, areaSqFt: e.target.value === '' ? '' : +e.target.value }))} className="input" min={0} />
            </div>
          </div>
          <div>
            <label className="label">Occupancy Status</label>
            <select value={editForm.occupancyStatus} onChange={(e) => setEditForm((f) => ({ ...f, occupancyStatus: e.target.value }))} className="input">
              {Object.keys(occupancyColors).map((s) => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
            </select>
          </div>
          <div className="flex gap-3 pt-1">
            <button
              onClick={() => editTarget && editMutation.mutate({
                id: editTarget._id,
                body: { flatNo: editForm.flatNo.trim(), flatType: editForm.flatType, occupancyStatus: editForm.occupancyStatus, ...(editForm.areaSqFt !== '' && { areaSqFt: Number(editForm.areaSqFt) }) },
              })}
              disabled={editMutation.isPending || !editForm.flatNo.trim()}
              className="btn-primary flex-1"
            >
              {editMutation.isPending ? 'Saving...' : 'Save Changes'}
            </button>
            <button onClick={() => setEditTarget(null)} className="btn-secondary">Cancel</button>
          </div>
        </div>
      </Modal>

      {/* Delete Flat Confirm */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        title={`Delete ${deleteTarget?.flatNo}?`}
        message={
          <>
            This permanently removes <strong>{deleteTarget?.flatNo}</strong>. If it still has {terms.person.toLowerCase()}s, vehicles, pets,
            or an active lease, deletion will be blocked — remove or reassign those first.
          </>
        }
        confirmLabel={`Delete ${terms.unit}`}
        isPending={deleteMutation.isPending}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget._id)}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}

function BedsPanel({ flatId, societyId }: { flatId: string; societyId: string }) {
  const queryClient = useQueryClient();
  const [assignBed, setAssignBed] = useState<Bed | null>(null);
  const [genCount, setGenCount] = useState(4);

  const { data: beds = [], isLoading } = useQuery({
    queryKey: ['beds', 'flat', flatId],
    queryFn: () => extractData<Bed[]>(api.get(`/beds/flat/${flatId}`)),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['beds', 'flat', flatId] });

  const generateMutation = useMutation({
    mutationFn: () => api.post('/beds/generate', { societyId, flatId, count: genCount }),
    onSuccess: (res) => {
      invalidate();
      toast.success(`${(res.data as any).data.length} beds generated`);
    },
  });

  const releaseMutation = useMutation({
    mutationFn: (bedId: string) => api.post(`/beds/${bedId}/release`),
    onSuccess: () => { invalidate(); toast.success('Bed released'); },
  });

  const maintenanceMutation = useMutation({
    mutationFn: ({ bedId, status }: { bedId: string; status: string }) => api.patch(`/beds/${bedId}`, { status }),
    onSuccess: () => { invalidate(); toast.success('Bed updated'); },
  });

  if (isLoading) return <div className="p-4 text-center text-slate-400 text-sm">Loading beds...</div>;

  return (
    <div className="px-6 py-4">
      {beds.length === 0 ? (
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-500">No beds set up for this room yet.</p>
          <div className="flex items-center gap-2">
            <input type="number" value={genCount} onChange={(e) => setGenCount(+e.target.value)} className="w-16 input text-sm py-1.5" min={1} max={20} />
            <button onClick={() => generateMutation.mutate()} disabled={generateMutation.isPending} className="btn-primary text-sm flex items-center gap-1.5 py-1.5">
              {generateMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <BedDouble className="w-3.5 h-3.5" />} Generate Beds
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {beds.map((bed) => {
            const resident = typeof bed.assignedResidentId === 'object' ? bed.assignedResidentId : null;
            return (
              <div key={bed._id} className="bg-white rounded-xl border border-slate-100 p-3 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-8 h-8 bg-primary-50 text-primary-600 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0">
                    {bed.bedNumber}
                  </div>
                  <div className="min-w-0">
                    <span className={cn('badge text-xs', bedStatusColors[bed.status] || 'badge-gray')}>{bed.status}</span>
                    {resident && <p className="text-xs text-slate-600 truncate mt-0.5">{resident.name}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {bed.status === 'OCCUPIED' && resident ? (
                    <button onClick={() => releaseMutation.mutate(bed._id)} title="Release bed" className="p-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100">
                      <UserX className="w-3.5 h-3.5" />
                    </button>
                  ) : bed.status !== 'MAINTENANCE' ? (
                    <button onClick={() => setAssignBed(bed)} title="Assign resident" className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100">
                      <Users className="w-3.5 h-3.5" />
                    </button>
                  ) : null}
                  <button
                    onClick={() => maintenanceMutation.mutate({ bedId: bed._id, status: bed.status === 'MAINTENANCE' ? 'VACANT' : 'MAINTENANCE' })}
                    title={bed.status === 'MAINTENANCE' ? 'Mark vacant' : 'Mark under maintenance'}
                    className="p-1.5 rounded-lg bg-amber-50 text-amber-600 hover:bg-amber-100"
                  >
                    <Wrench className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <BedAssignModal bedId={assignBed?._id || null} bedNumber={assignBed?.bedNumber} flatId={flatId} onClose={() => setAssignBed(null)} />
    </div>
  );
}
