import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Users, Phone, Home, CheckCircle2, ClipboardCheck, MapPin, Building2, Layers3, Pencil, UserX, ArrowUp, ArrowDown, ArrowUpDown, MoreHorizontal } from 'lucide-react';
import { api, extractData } from '../../services/api';
import { PageHeader } from '../../components/common/PageHeader';
import { EmptyState } from '../../components/common/EmptyState';
import { Modal } from '../../components/common/Modal';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { VoiceInputField } from '../../components/common/VoiceInputField';
import { TableSkeleton } from '../../components/common/LoadingSkeleton';
import { useAuthStore } from '../../store/authStore';
import { useSocietyStore } from '../../store/societyStore';
import { Resident, Tower, Floor } from '../../types';
import { useTerminology } from '../../utils/terminology';
import toast from 'react-hot-toast';

const MEMBER_TYPES = ['OWNER', 'TENANT', 'FAMILY_MEMBER', 'STAFF', 'VENDOR'];
const TOWER_TYPES = ['TOWER', 'BLOCK', 'VILLA_ROW', 'SHOP_BLOCK', 'OTHER'];
const FLAT_TYPES = ['1BHK', '2BHK', '3BHK', '4BHK', 'PENTHOUSE', 'VILLA', 'SHOP', 'OFFICE', 'PARKING', 'STAFF_QUARTERS', 'OTHER'];
const CREATE_NEW_FLAT = '__new_flat__';
const CREATE_NEW_TOWER = '__new_tower__';

const BLANK_QUICK_TOWER = {
  name: '', type: 'TOWER', numberOfFloors: 10, hasLift: false,
  hasGroundFloor: true, groundFloorFlats: 0, basementCount: 0, basementPrefix: 'B',
};
const BLANK_QUICK_FLAT = { towerId: '', floorId: '', flatNo: '', flatType: '2BHK', areaSqFt: '' as number | '' };

export function ResidentPage() {
  const { user } = useAuthStore();
  const { currentSociety } = useSocietyStore();
  const societyId = currentSociety?._id || user?.societyId || '';
  const queryClient = useQueryClient();
  const terms = useTerminology();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState<'flatNo' | 'name' | 'memberType' | 'kycStatus'>('flatNo');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [tableTowerFilter, setTableTowerFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ societyId, flatId: '', name: '', mobile: '', email: '', memberType: 'OWNER', primaryContact: true, loginAllowed: false });
  const [addTowerId, setAddTowerId] = useState('');
  const [addFloorId, setAddFloorId] = useState('');

  const [kycTarget, setKycTarget] = useState<Resident | null>(null);
  const [kycForm, setKycForm] = useState({ physicalLocation: '', notes: '' });

  const [editTarget, setEditTarget] = useState<Resident | null>(null);
  const [editForm, setEditForm] = useState({ flatId: '', name: '', mobile: '', email: '', memberType: 'OWNER', primaryContact: true, loginAllowed: false });
  const [editTowerId, setEditTowerId] = useState('');
  const [editFloorId, setEditFloorId] = useState('');
  const [removeTarget, setRemoveTarget] = useState<Resident | null>(null);

  // Reverse flow: an admin picking "Add Resident" first often hasn't set up towers/floors/flats
  // yet. These let them create a flat (and a tower, if needed) inline instead of bailing out to
  // the Towers page and losing their place.
  const [showQuickFlatModal, setShowQuickFlatModal] = useState(false);
  const [quickFlatForm, setQuickFlatForm] = useState(BLANK_QUICK_FLAT);
  const [flatNoAutoFilled, setFlatNoAutoFilled] = useState(true);
  const [showQuickTowerModal, setShowQuickTowerModal] = useState(false);
  const [quickTowerForm, setQuickTowerForm] = useState(BLANK_QUICK_TOWER);

  const { data: flats } = useQuery({ queryKey: ['flats-list', societyId], queryFn: () => extractData<any>(api.get(`/flats/society/${societyId}?limit=200`)), enabled: !!societyId });

  // Always enabled (not just while the quick-add-tower flow is open) — the Tower/Floor
  // cascade on the main Add/Edit Resident flat pickers needs this too, so a big society
  // isn't stuck scrolling one flat list with every tower's flats mixed together.
  const { data: towers } = useQuery({
    queryKey: ['towers', societyId],
    queryFn: () => extractData<Tower[]>(api.get(`/towers/society/${societyId}`)),
    enabled: !!societyId,
  });

  const { data: quickFloors } = useQuery({
    queryKey: ['floors', quickFlatForm.towerId],
    queryFn: () => extractData<Floor[]>(api.get(`/floors/tower/${quickFlatForm.towerId}`)),
    enabled: !!quickFlatForm.towerId,
  });

  const { data, isLoading } = useQuery({
    queryKey: ['residents', societyId, page, search, sortBy, sortDir, tableTowerFilter],
    queryFn: () => extractData<any>(api.get(`/residents/society/${societyId}?page=${page}&limit=20&sortBy=${sortBy}&sortDir=${sortDir}${search ? `&search=${search}` : ''}${tableTowerFilter ? `&towerId=${tableTowerFilter}` : ''}`)),
    enabled: !!societyId,
  });

  // Floor options for a Tower/Floor cascade, derived from the already-loaded flats list (no
  // extra request) — flatId.floorId comes back populated with {floorNumber, floorName} on the
  // flats list, so this just dedupes and sorts into real building order.
  const floorOptionsForTower = (towerId: string) => {
    const seen = new Map<string, { _id: string; floorName: string; floorNumber: number }>();
    (flats?.items || []).forEach((f: any) => {
      if (f.towerId?._id === towerId && f.floorId?._id && !seen.has(f.floorId._id)) {
        seen.set(f.floorId._id, { _id: f.floorId._id, floorName: f.floorId.floorName, floorNumber: f.floorId.floorNumber });
      }
    });
    return [...seen.values()].sort((a, b) => a.floorNumber - b.floorNumber);
  };

  const toggleSort = (field: typeof sortBy) => {
    setPage(1);
    if (sortBy === field) { setSortDir((d) => (d === 'asc' ? 'desc' : 'asc')); return; }
    setSortBy(field);
    setSortDir('asc');
  };

  const mutation = useMutation({
    mutationFn: (data: any) => api.post('/residents', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['residents'] });
      // Adding a resident flips the flat's occupancy on the backend (Vacant -> Occupied) —
      // without this, the Flats page keeps showing the pre-add cached state until reloaded.
      queryClient.invalidateQueries({ queryKey: ['flats'] });
      setShowModal(false);
      toast.success('Resident added!');
    },
  });

  const kycMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: any }) => api.patch(`/residents/${id}/kyc`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['residents'] });
      setKycTarget(null);
      setKycForm({ physicalLocation: '', notes: '' });
      toast.success('KYC marked as verified!');
    },
  });

  const editMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: any }) => api.patch(`/residents/${id}`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['residents'] });
      // Editing can reassign a resident to a different flat, which flips occupancy on both
      // the old and new flat — see the comment on the add-resident mutation above.
      queryClient.invalidateQueries({ queryKey: ['flats'] });
      setEditTarget(null);
      toast.success('Resident updated!');
    },
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/residents/${id}/disable`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['residents'] });
      // Removing the last resident on a flat flips it back to Vacant on the backend.
      queryClient.invalidateQueries({ queryKey: ['flats'] });
      setRemoveTarget(null);
      toast.success('Resident removed');
    },
  });

  const createTowerMutation = useMutation({
    mutationFn: async (t: typeof quickTowerForm) => {
      const res = await api.post('/towers', { ...t, societyId });
      const tower = res.data.data;
      await api.post('/floors/generate', {
        societyId, towerId: tower._id,
        count: t.numberOfFloors,
        hasGroundFloor: t.hasGroundFloor,
        groundFloorFlats: t.groundFloorFlats,
        basementCount: t.basementCount,
        basementPrefix: t.basementPrefix,
      });
      return tower as Tower;
    },
    onSuccess: (tower) => {
      queryClient.invalidateQueries({ queryKey: ['towers'] });
      setQuickFlatForm((f) => ({ ...f, towerId: tower._id, floorId: '' }));
      setFlatNoAutoFilled(true);
      setShowQuickTowerModal(false);
      setQuickTowerForm(BLANK_QUICK_TOWER);
      toast.success(`${terms.building} "${tower.name}" created — now pick a floor`);
    },
  });

  const createFlatMutation = useMutation({
    mutationFn: async (f: typeof quickFlatForm) => {
      const res = await api.post('/flats', {
        societyId, towerId: f.towerId, floorId: f.floorId,
        flatNo: f.flatNo.trim(), flatType: f.flatType,
        ...(f.areaSqFt !== '' && { areaSqFt: Number(f.areaSqFt) }),
      }, { skipErrorToast: true } as any);
      return res.data.data;
    },
    onSuccess: (newFlat) => {
      queryClient.invalidateQueries({ queryKey: ['flats-list'] });
      queryClient.invalidateQueries({ queryKey: ['floors'] });
      queryClient.invalidateQueries({ queryKey: ['towers'] });
      set('flatId')(newFlat._id);
      setShowQuickFlatModal(false);
      setQuickFlatForm(BLANK_QUICK_FLAT);
      toast.success(`${terms.unit} ${newFlat.flatNo} created and selected!`);
    },
    onError: (err: any) => {
      const isDuplicate = err?.response?.data?.error?.code === 'DUPLICATE_KEY';
      toast.error(isDuplicate
        ? `${terms.unit} number "${quickFlatForm.flatNo}" already exists in this ${terms.org.toLowerCase()} — pick a different number.`
        : (err?.response?.data?.error?.message || `Failed to create ${terms.unit.toLowerCase()}`));
    },
  });

  const set = (k: string) => (v: string | boolean) => setForm((f) => ({ ...f, [k]: v }));

  const openKyc = (r: Resident) => {
    setKycTarget(r);
    setKycForm({ physicalLocation: r.kycPhysicalLocation || '', notes: r.kycNotes || '' });
  };

  const selectedTower = towers?.find((t) => t._id === quickFlatForm.towerId) ?? null;
  const flatNoTrimmed = quickFlatForm.flatNo.trim().toLowerCase();
  const looksLikeDuplicate = !!flatNoTrimmed && (flats?.items || []).some((f: any) => f.flatNo.trim().toLowerCase() === flatNoTrimmed);

  const prefixForFloor = (floor: Floor | undefined, tower: Tower | null) =>
    floor ? (floor.flatNumberPrefix || `${(tower?.name || '').split(' ').pop()}-${floor.floorNumber}`) : '';

  const onFloorChange = (floorId: string) => {
    const floor = quickFloors?.find((fl) => fl._id === floorId);
    if (flatNoAutoFilled || !quickFlatForm.flatNo) {
      setQuickFlatForm((f) => ({ ...f, floorId, flatNo: `${prefixForFloor(floor, selectedTower)}01` }));
      setFlatNoAutoFilled(true);
    } else {
      setQuickFlatForm((f) => ({ ...f, floorId }));
    }
  };

  const openEdit = (r: Resident) => {
    const flatObj = typeof r.flatId === 'object' ? (r.flatId as any) : null;
    setEditTarget(r);
    setEditForm({
      flatId: flatObj?._id || r.flatId,
      name: r.name, mobile: r.mobile, email: r.email || '',
      memberType: r.memberType, primaryContact: r.primaryContact, loginAllowed: r.loginAllowed,
    });
    // Pre-seed the Tower/Floor cascade to the resident's current flat, so editing someone
    // doesn't dump the admin back into the full unfiltered flat list.
    setEditTowerId(flatObj?.towerId?._id || '');
    setEditFloorId(typeof flatObj?.floorId === 'string' ? flatObj.floorId : flatObj?.floorId?._id || '');
  };

  return (
    <div className="space-y-6">
      <PageHeader title={terms.personPlural} subtitle={`Manage all ${terms.person.toLowerCase()}s, owners, and tenants`}
        action={<button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2"><Plus className="w-4 h-4" /> Add {terms.person}</button>} />

      <div className="card p-4 space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input placeholder="Search by name, mobile, email, flat no, type..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="input pl-10" />
        </div>
        <TowerTabBar
          towers={towers || []}
          selected={tableTowerFilter}
          onSelect={(id) => { setTableTowerFilter(id); setPage(1); }}
          allLabel={`All ${terms.buildingPlural}`}
        />
      </div>

      {isLoading ? <TableSkeleton rows={6} cols={5} /> : (
        <div className="card overflow-hidden">
          {!data?.items?.length ? (
            <EmptyState icon={Users} title={`No ${terms.person.toLowerCase()}s yet`} description={`Add your first ${terms.person.toLowerCase()} to get started`}
              action={<button onClick={() => setShowModal(true)} className="btn-primary">Add {terms.person}</button>} />
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead><tr className="border-b border-slate-100">
                    <SortableHeader label="Resident" field="name" sortBy={sortBy} sortDir={sortDir} onSort={toggleSort} />
                    <th className="table-header text-left">Contact</th>
                    <SortableHeader label={terms.unit} field="flatNo" sortBy={sortBy} sortDir={sortDir} onSort={toggleSort} />
                    {(towers?.length || 0) > 1 && <th className="table-header text-left">{terms.building}</th>}
                    <SortableHeader label="Type" field="memberType" sortBy={sortBy} sortDir={sortDir} onSort={toggleSort} />
                    <SortableHeader label="KYC" field="kycStatus" sortBy={sortBy} sortDir={sortDir} onSort={toggleSort} />
                    <th className="table-header text-left">Actions</th>
                  </tr></thead>
                  <tbody className="divide-y divide-slate-50">
                    {data.items.map((r: Resident) => (
                      <tr key={r._id} className="table-row group">
                        <td className="table-cell">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-xl flex items-center justify-center text-white text-sm font-bold">{r.name[0]}</div>
                            <div><p className="font-semibold text-slate-800 text-sm">{r.name}</p>{r.email && <p className="text-xs text-slate-500">{r.email}</p>}</div>
                          </div>
                        </td>
                        <td className="table-cell"><div className="flex items-center gap-1 text-xs text-slate-600"><Phone className="w-3 h-3 text-slate-400" />{r.mobile}</div></td>
                        <td className="table-cell"><div className="flex items-center gap-1 text-xs"><Home className="w-3 h-3 text-slate-400" />{(r.flatId as any)?.flatNo || 'N/A'}</div></td>
                        {(towers?.length || 0) > 1 && (
                          <td className="table-cell"><span className="text-xs text-slate-500">{(r.flatId as any)?.towerId?.name || '—'}</span></td>
                        )}
                        <td className="table-cell"><span className={`badge ${r.memberType === 'OWNER' ? 'badge-blue' : r.memberType === 'TENANT' ? 'badge-purple' : 'badge-gray'}`}>{r.memberType}</span></td>
                        <td className="table-cell">
                          {r.kycStatus === 'VERIFIED' ? (
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-1.5">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                                <span className="text-xs font-medium text-emerald-700">Verified</span>
                              </div>
                              {r.kycVerifiedBy && <p className="text-xs text-slate-400">by {r.kycVerifiedBy.name}</p>}
                              {r.kycPhysicalLocation && (
                                <div className="flex items-center gap-1 text-xs text-slate-400">
                                  <MapPin className="w-2.5 h-2.5 flex-shrink-0" />
                                  <span className="truncate max-w-[120px]" title={r.kycPhysicalLocation}>{r.kycPhysicalLocation}</span>
                                </div>
                              )}
                            </div>
                          ) : (
                            <button
                              onClick={() => openKyc(r)}
                              className="flex items-center gap-1.5 text-xs font-medium text-primary-600 bg-primary-50 hover:bg-primary-100 px-2.5 py-1.5 rounded-lg transition-colors whitespace-nowrap"
                            >
                              <ClipboardCheck className="w-3.5 h-3.5" /> Mark KYC Done
                            </button>
                          )}
                        </td>
                        <td className="table-cell">
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => openEdit(r)} title="Edit" className="p-1.5 rounded-lg bg-slate-50 text-slate-500 hover:bg-primary-50 hover:text-primary-600 transition-colors">
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => setRemoveTarget(r)} title="Remove" className="p-1.5 rounded-lg bg-slate-50 text-slate-500 hover:bg-red-50 hover:text-red-600 transition-colors">
                              <UserX className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {data?.totalPages > 1 && (
                <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100">
                  <p className="text-sm text-slate-500">Page {page} of {data.totalPages} ({data.total} residents)</p>
                  <div className="flex gap-2">
                    <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="btn-secondary text-sm py-1.5 px-3 disabled:opacity-50">Prev</button>
                    <button disabled={page >= data.totalPages} onClick={() => setPage((p) => p + 1)} className="btn-secondary text-sm py-1.5 px-3 disabled:opacity-50">Next</button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Add Resident Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Add Resident">
        <div className="space-y-4">
          <VoiceInputField label="Full Name" value={form.name} onChange={(v) => set('name')(v)} placeholder="Raj Sharma" required />
          <VoiceInputField label="Mobile" value={form.mobile} onChange={(v) => set('mobile')(v)} placeholder="9876543210" required type="tel" />
          <VoiceInputField label="Email" value={form.email} onChange={(v) => set('email')(v)} placeholder="raj@example.com" type="email" />
          {(towers?.length || 0) > 1 && (
            <div><label className="label">{terms.building}</label>
              <select
                value={addTowerId}
                onChange={(e) => { setAddTowerId(e.target.value); setAddFloorId(''); set('flatId')(''); }}
                className="input"
              >
                <option value="">All {terms.buildingPlural.toLowerCase()}...</option>
                {towers?.map((t) => <option key={t._id} value={t._id}>{t.name}</option>)}
              </select>
            </div>
          )}
          {addTowerId && (
            <div><label className="label">Floor</label>
              <select
                value={addFloorId}
                onChange={(e) => { setAddFloorId(e.target.value); set('flatId')(''); }}
                className="input"
              >
                <option value="">All floors...</option>
                {floorOptionsForTower(addTowerId).map((fl) => <option key={fl._id} value={fl._id}>{fl.floorName}</option>)}
              </select>
            </div>
          )}
          <div><label className="label">{terms.unit} <span className="text-red-500">*</span></label>
            <select
              value={form.flatId}
              onChange={(e) => {
                if (e.target.value === CREATE_NEW_FLAT) { setShowQuickFlatModal(true); return; }
                set('flatId')(e.target.value);
              }}
              className="input" required
            >
              <option value="">Select {terms.unit.toLowerCase()}...</option>
              {flats?.items
                ?.filter((f: any) => (!addTowerId || f.towerId?._id === addTowerId) && (!addFloorId || f.floorId?._id === addFloorId))
                .map((f: any) => <option key={f._id} value={f._id}>{addTowerId ? f.flatNo : (f.towerId?.name ? `${f.towerId.name} - ${f.flatNo}` : f.flatNo)}</option>)}
              <option value={CREATE_NEW_FLAT}>+ Create New {terms.unit}...</option>
            </select>
            {!flats?.items?.length && (
              <p className="mt-1 text-xs text-slate-400">No {terms.unitPlural.toLowerCase()} set up yet — choose "+ Create New {terms.unit}" above to add one on the spot.</p>
            )}
          </div>
          <div><label className="label">Member Type</label>
            <select value={form.memberType} onChange={(e) => set('memberType')(e.target.value)} className="input">
              {MEMBER_TYPES.map((t) => <option key={t}>{t}</option>)}
            </select></div>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
              <input type="checkbox" checked={form.primaryContact} onChange={(e) => set('primaryContact')(e.target.checked)} className="w-4 h-4 text-primary-600" />
              Primary Contact
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
              <input type="checkbox" checked={form.loginAllowed} onChange={(e) => set('loginAllowed')(e.target.checked)} className="w-4 h-4 text-primary-600" />
              Allow Resident App Login by Same Mobile Number
            </label>
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={() => mutation.mutate({ ...form, societyId })} disabled={mutation.isPending || !form.flatId} className="btn-primary flex-1">{mutation.isPending ? 'Adding...' : `Add ${terms.person}`}</button>
            <button onClick={() => { setShowModal(false); setAddTowerId(''); setAddFloorId(''); }} className="btn-secondary">Cancel</button>
          </div>
        </div>
      </Modal>

      {/* Edit Resident Modal */}
      <Modal isOpen={!!editTarget} onClose={() => setEditTarget(null)} title="Edit Resident">
        <div className="space-y-4">
          <VoiceInputField label="Full Name" value={editForm.name} onChange={(v) => setEditForm((f) => ({ ...f, name: v }))} placeholder="Raj Sharma" required />
          <VoiceInputField label="Mobile" value={editForm.mobile} onChange={(v) => setEditForm((f) => ({ ...f, mobile: v }))} placeholder="9876543210" required type="tel" />
          <VoiceInputField label="Email" value={editForm.email} onChange={(v) => setEditForm((f) => ({ ...f, email: v }))} placeholder="raj@example.com" type="email" />
          {(towers?.length || 0) > 1 && (
            <div><label className="label">{terms.building}</label>
              <select
                value={editTowerId}
                onChange={(e) => { setEditTowerId(e.target.value); setEditFloorId(''); setEditForm((f) => ({ ...f, flatId: '' })); }}
                className="input"
              >
                <option value="">All {terms.buildingPlural.toLowerCase()}...</option>
                {towers?.map((t) => <option key={t._id} value={t._id}>{t.name}</option>)}
              </select>
            </div>
          )}
          {editTowerId && (
            <div><label className="label">Floor</label>
              <select
                value={editFloorId}
                onChange={(e) => { setEditFloorId(e.target.value); setEditForm((f) => ({ ...f, flatId: '' })); }}
                className="input"
              >
                <option value="">All floors...</option>
                {floorOptionsForTower(editTowerId).map((fl) => <option key={fl._id} value={fl._id}>{fl.floorName}</option>)}
              </select>
            </div>
          )}
          <div><label className="label">{terms.unit} <span className="text-red-500">*</span></label>
            <select value={editForm.flatId} onChange={(e) => setEditForm((f) => ({ ...f, flatId: e.target.value }))} className="input" required>
              <option value="">Select {terms.unit.toLowerCase()}...</option>
              {flats?.items
                ?.filter((f: any) => (!editTowerId || f.towerId?._id === editTowerId) && (!editFloorId || f.floorId?._id === editFloorId))
                .map((f: any) => <option key={f._id} value={f._id}>{editTowerId ? f.flatNo : (f.towerId?.name ? `${f.towerId.name} - ${f.flatNo}` : f.flatNo)}</option>)}
            </select>
          </div>
          <div><label className="label">Member Type</label>
            <select value={editForm.memberType} onChange={(e) => setEditForm((f) => ({ ...f, memberType: e.target.value }))} className="input">
              {MEMBER_TYPES.map((t) => <option key={t}>{t}</option>)}
            </select></div>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
              <input type="checkbox" checked={editForm.primaryContact} onChange={(e) => setEditForm((f) => ({ ...f, primaryContact: e.target.checked }))} className="w-4 h-4 text-primary-600" />
              Primary Contact
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
              <input type="checkbox" checked={editForm.loginAllowed} onChange={(e) => setEditForm((f) => ({ ...f, loginAllowed: e.target.checked }))} className="w-4 h-4 text-primary-600" />
              Allow Resident App Login by Same Mobile Number
            </label>
          </div>
          <div className="flex gap-3 pt-2">
            <button
              onClick={() => editTarget && editMutation.mutate({ id: editTarget._id, body: editForm })}
              disabled={editMutation.isPending || !editForm.flatId}
              className="btn-primary flex-1"
            >
              {editMutation.isPending ? 'Saving...' : 'Save Changes'}
            </button>
            <button onClick={() => setEditTarget(null)} className="btn-secondary">Cancel</button>
          </div>
        </div>
      </Modal>

      {/* Remove Resident Confirm */}
      <ConfirmDialog
        isOpen={!!removeTarget}
        title={`Remove ${removeTarget?.name}?`}
        message={
          <>
            This removes <strong>{removeTarget?.name}</strong> from the {terms.person.toLowerCase()} list and revokes their app login.
            Their KYC and payment history are kept, not deleted — an admin can re-add them later if needed.
          </>
        }
        confirmLabel="Remove Resident"
        isPending={removeMutation.isPending}
        onConfirm={() => removeTarget && removeMutation.mutate(removeTarget._id)}
        onCancel={() => setRemoveTarget(null)}
      />

      {/* Quick Add Flat Modal (reverse flow) */}
      <Modal isOpen={showQuickFlatModal} onClose={() => { setShowQuickFlatModal(false); setQuickFlatForm(BLANK_QUICK_FLAT); }} title={`Create New ${terms.unit}`}>
        <div className="space-y-4">
          <div>
            <label className="label">{terms.building} <span className="text-red-500">*</span></label>
            <select
              value={quickFlatForm.towerId}
              onChange={(e) => {
                if (e.target.value === CREATE_NEW_TOWER) { setShowQuickTowerModal(true); return; }
                setQuickFlatForm((f) => ({ ...f, towerId: e.target.value, floorId: '', flatNo: '' }));
                setFlatNoAutoFilled(true);
              }}
              className="input"
            >
              <option value="">Select {terms.building.toLowerCase()}...</option>
              {towers?.map((t) => <option key={t._id} value={t._id}>{t.name}</option>)}
              <option value={CREATE_NEW_TOWER}>+ Create New {terms.building}...</option>
            </select>
            {!towers?.length && (
              <p className="mt-1 text-xs text-slate-400 flex items-center gap-1"><Building2 className="w-3 h-3" /> No {terms.buildingPlural.toLowerCase()} yet — choose "+ Create New {terms.building}" above.</p>
            )}
          </div>

          {quickFlatForm.towerId && (
            <div>
              <label className="label">Floor <span className="text-red-500">*</span></label>
              <select value={quickFlatForm.floorId} onChange={(e) => onFloorChange(e.target.value)} className="input">
                <option value="">Select floor...</option>
                {quickFloors?.map((fl) => <option key={fl._id} value={fl._id}>{fl.floorName}</option>)}
              </select>
              {!quickFloors?.length && (
                <p className="mt-1 text-xs text-slate-400 flex items-center gap-1"><Layers3 className="w-3 h-3" /> This {terms.building.toLowerCase()} has no floors yet.</p>
              )}
            </div>
          )}

          {quickFlatForm.floorId && (
            <>
              <div>
                <label className="label">{terms.unit} No. <span className="text-red-500">*</span></label>
                <input
                  value={quickFlatForm.flatNo}
                  onChange={(e) => { setQuickFlatForm((f) => ({ ...f, flatNo: e.target.value })); setFlatNoAutoFilled(false); }}
                  className="input"
                  placeholder="e.g. G01, 101, 205"
                />
                {looksLikeDuplicate && (
                  <p className="mt-1 text-xs text-red-500">A {terms.unit.toLowerCase()} with this number already exists in this {terms.org.toLowerCase()} — pick a different number.</p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">{terms.unit} Type</label>
                  <select value={quickFlatForm.flatType} onChange={(e) => setQuickFlatForm((f) => ({ ...f, flatType: e.target.value }))} className="input">
                    {FLAT_TYPES.map((t) => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Area (sq ft)</label>
                  <input type="number" value={quickFlatForm.areaSqFt} onChange={(e) => setQuickFlatForm((f) => ({ ...f, areaSqFt: e.target.value === '' ? '' : +e.target.value }))} className="input" min={0} />
                </div>
              </div>
            </>
          )}

          <div className="flex gap-3 pt-2">
            <button
              onClick={() => createFlatMutation.mutate(quickFlatForm)}
              disabled={createFlatMutation.isPending || !quickFlatForm.floorId || !quickFlatForm.flatNo.trim() || looksLikeDuplicate}
              className="btn-primary flex-1"
            >
              {createFlatMutation.isPending ? 'Creating...' : `Create & Select ${terms.unit}`}
            </button>
            <button onClick={() => { setShowQuickFlatModal(false); setQuickFlatForm(BLANK_QUICK_FLAT); }} className="btn-secondary">Cancel</button>
          </div>
        </div>
      </Modal>

      {/* Quick Add Tower Modal (nested reverse flow, one level deeper) */}
      <Modal isOpen={showQuickTowerModal} onClose={() => setShowQuickTowerModal(false)} title={`Create New ${terms.building}`}>
        <div className="space-y-4">
          <VoiceInputField label={`${terms.building} Name`} value={quickTowerForm.name} onChange={(v) => setQuickTowerForm((f) => ({ ...f, name: v }))} placeholder="Tower A" required />
          <div>
            <label className="label">Type</label>
            <select value={quickTowerForm.type} onChange={(e) => setQuickTowerForm((f) => ({ ...f, type: e.target.value }))} className="input">
              {TOWER_TYPES.map((t) => <option key={t}>{t.replace(/_/g, ' ')}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Number of Floors</label>
            <input type="number" value={quickTowerForm.numberOfFloors} onChange={(e) => setQuickTowerForm((f) => ({ ...f, numberOfFloors: +e.target.value }))} className="input" min={1} max={99} />
            <p className="text-xs text-slate-400 mt-1">Typical floors only — Ground floor and basements are separate below</p>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl space-y-3">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={quickTowerForm.hasGroundFloor} onChange={(e) => setQuickTowerForm((f) => ({ ...f, hasGroundFloor: e.target.checked }))} className="w-4 h-4 text-primary-600 rounded" />
              Has Ground Floor
            </label>
            {quickTowerForm.hasGroundFloor && (
              <div>
                <label className="label text-xs">Ground Floor Flats</label>
                <input type="number" value={quickTowerForm.groundFloorFlats} onChange={(e) => setQuickTowerForm((f) => ({ ...f, groundFloorFlats: +e.target.value }))} className="input" min={0} max={50} />
                <p className="text-xs text-slate-400 mt-1">0 if lobby/reception only</p>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label text-xs">Basement Levels</label>
                <input type="number" value={quickTowerForm.basementCount} onChange={(e) => setQuickTowerForm((f) => ({ ...f, basementCount: +e.target.value }))} className="input" min={0} max={5} />
              </div>
              {quickTowerForm.basementCount > 0 && (
                <div>
                  <label className="label text-xs">Basement Prefix</label>
                  <select value={quickTowerForm.basementPrefix} onChange={(e) => setQuickTowerForm((f) => ({ ...f, basementPrefix: e.target.value }))} className="input">
                    <option value="B">B (Basement)</option>
                    <option value="P">P (Parking)</option>
                  </select>
                </div>
              )}
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={quickTowerForm.hasLift} onChange={(e) => setQuickTowerForm((f) => ({ ...f, hasLift: e.target.checked }))} className="w-4 h-4 text-primary-600 rounded" />
            Has Lift / Elevator
          </label>
          <div className="flex gap-3 pt-2">
            <button onClick={() => createTowerMutation.mutate(quickTowerForm)} disabled={createTowerMutation.isPending || !quickTowerForm.name} className="btn-primary flex-1">
              {createTowerMutation.isPending ? 'Creating...' : `Create ${terms.building}`}
            </button>
            <button onClick={() => setShowQuickTowerModal(false)} className="btn-secondary">Cancel</button>
          </div>
        </div>
      </Modal>

      {/* Mark KYC Done Modal */}
      <Modal isOpen={!!kycTarget} onClose={() => setKycTarget(null)} title="Mark KYC Done">
        <div className="space-y-4">
          <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl">
            <p className="text-sm font-semibold text-amber-900 mb-1">{kycTarget?.name}</p>
            <p className="text-xs text-amber-700">Keep physical copies of KYC documents in a secure file. Record the exact location below so they can be retrieved when needed. No digital copies are stored.</p>
          </div>

          <div>
            <label className="label">Physical Document Location <span className="text-red-500">*</span></label>
            <input
              value={kycForm.physicalLocation}
              onChange={(e) => setKycForm((f) => ({ ...f, physicalLocation: e.target.value }))}
              placeholder="e.g. Almira 1, File 3, Admin Office"
              className="input"
            />
            <p className="mt-1 text-xs text-slate-400">Describe where the physical KYC file is kept</p>
          </div>

          <div>
            <label className="label">Notes <span className="text-slate-400 font-normal">(optional)</span></label>
            <textarea
              value={kycForm.notes}
              onChange={(e) => setKycForm((f) => ({ ...f, notes: e.target.value }))}
              placeholder="Any additional notes..."
              className="input resize-none"
              rows={3}
            />
          </div>

          <div className="flex gap-3 pt-1">
            <button
              onClick={() => kycTarget && kycMutation.mutate({ id: kycTarget._id, body: kycForm })}
              disabled={kycMutation.isPending || !kycForm.physicalLocation.trim()}
              className="btn-primary flex-1 flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              {kycMutation.isPending ? 'Saving...' : 'Confirm KYC Done'}
            </button>
            <button onClick={() => setKycTarget(null)} className="btn-secondary">Cancel</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

interface TowerTabBarProps {
  towers: Tower[];
  selected: string;
  onSelect: (towerId: string) => void;
  allLabel: string;
}

// Segmented tower/block filter — up to 3 shown as tabs, the rest collapse into an overflow
// menu (still showing the selected tower's name on the trigger if it's in the overflow) so
// this doesn't blow out horizontally for a society with many towers.
function TowerTabBar({ towers, selected, onSelect, allLabel }: TowerTabBarProps) {
  const [showMenu, setShowMenu] = useState(false);
  if (towers.length < 2) return null;
  const visible = towers.slice(0, 3);
  const overflow = towers.slice(3);
  const selectedOverflow = overflow.find((t) => t._id === selected);
  const tabClass = (active: boolean) =>
    `px-3 py-1.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${active ? 'bg-primary-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`;

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <button onClick={() => onSelect('')} className={tabClass(selected === '')}>{allLabel}</button>
      {visible.map((t) => <button key={t._id} onClick={() => onSelect(t._id)} className={tabClass(selected === t._id)}>{t.name}</button>)}
      {overflow.length > 0 && (
        <div className="relative">
          <button onClick={() => setShowMenu((s) => !s)} className={tabClass(!!selectedOverflow)}>
            {selectedOverflow ? selectedOverflow.name : <MoreHorizontal className="w-4 h-4" />}
          </button>
          {showMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
              <div className="absolute z-20 mt-1 bg-white shadow-lg rounded-xl border border-slate-100 p-1 min-w-[160px] max-h-64 overflow-y-auto">
                {overflow.map((t) => (
                  <button
                    key={t._id}
                    onClick={() => { onSelect(t._id); setShowMenu(false); }}
                    className={`block w-full text-left px-3 py-1.5 text-sm rounded-lg hover:bg-slate-50 ${selected === t._id ? 'text-primary-600 font-medium' : 'text-slate-700'}`}
                  >
                    {t.name}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

interface SortableHeaderProps {
  label: string;
  field: 'flatNo' | 'name' | 'memberType' | 'kycStatus';
  sortBy: string;
  sortDir: 'asc' | 'desc';
  onSort: (field: 'flatNo' | 'name' | 'memberType' | 'kycStatus') => void;
}

function SortableHeader({ label, field, sortBy, sortDir, onSort }: SortableHeaderProps) {
  const active = sortBy === field;
  return (
    <th className="table-header text-left">
      <button onClick={() => onSort(field)} className={`flex items-center gap-1 hover:text-slate-700 transition-colors ${active ? 'text-slate-700' : ''}`}>
        {label}
        {active ? (sortDir === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />) : <ArrowUpDown className="w-3 h-3 opacity-40" />}
      </button>
    </th>
  );
}
