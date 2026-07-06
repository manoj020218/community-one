import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Car } from 'lucide-react';
import { api, extractData } from '../../services/api';
import { PageHeader } from '../../components/common/PageHeader';
import { EmptyState } from '../../components/common/EmptyState';
import { Modal } from '../../components/common/Modal';
import { VoiceInputField } from '../../components/common/VoiceInputField';
import { TableSkeleton } from '../../components/common/LoadingSkeleton';
import { useAuthStore } from '../../store/authStore';
import { useSocietyStore } from '../../store/societyStore';
import { Vehicle } from '../../types';
import toast from 'react-hot-toast';
import { cn } from '../../utils/cn';

const VEHICLE_TYPES = ['CAR','BIKE','SCOOTER','CYCLE','COMMERCIAL','STAFF','VISITOR','OTHER'];

export function VehiclePage() {
  const { user } = useAuthStore();
  const { currentSociety } = useSocietyStore();
  const societyId = currentSociety?._id || user?.societyId || '';
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ societyId, flatId: '', vehicleNo: '', vehicleType: 'CAR', brand: '', model: '', color: '', parkingSlot: '' });

  const { data: flats } = useQuery({ queryKey: ['flats-list', societyId], queryFn: () => extractData<any>(api.get(`/flats/society/${societyId}?limit=200`)), enabled: !!societyId });

  const { data, isLoading } = useQuery({
    queryKey: ['vehicles', societyId, search],
    queryFn: () => extractData<any>(api.get(`/vehicles/society/${societyId}?limit=50${search ? `&search=${search}` : ''}`)),
    enabled: !!societyId,
  });

  const mutation = useMutation({
    mutationFn: (d: any) => api.post('/vehicles', d),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['vehicles'] }); setShowModal(false); toast.success('Vehicle registered!'); },
  });

  const set = (k: string) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  const typeColors: Record<string, string> = { CAR: 'badge-blue', BIKE: 'badge-purple', SCOOTER: 'badge-yellow', CYCLE: 'badge-green', COMMERCIAL: 'badge-red', STAFF: 'badge-gray', VISITOR: 'badge-gray', OTHER: 'badge-gray' };

  return (
    <div className="space-y-6">
      <PageHeader title="Vehicles" subtitle="Manage all registered vehicles"
        action={<button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2"><Plus className="w-4 h-4" /> Register Vehicle</button>} />

      <div className="card p-4">
        <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input placeholder="Search by vehicle number, brand..." value={search} onChange={(e) => setSearch(e.target.value)} className="input pl-10" /></div>
      </div>

      {isLoading ? <TableSkeleton rows={6} cols={5} /> : (
        <div className="card overflow-hidden">
          {!data?.items?.length ? (
            <EmptyState icon={Car} title="No vehicles registered" description="Register your first vehicle" action={<button onClick={() => setShowModal(true)} className="btn-primary">Register Vehicle</button>} />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead><tr className="border-b border-slate-100">
                  <th className="table-header text-left">Vehicle No</th>
                  <th className="table-header text-left">Type</th>
                  <th className="table-header text-left">Details</th>
                  <th className="table-header text-left">Flat</th>
                  <th className="table-header text-left">Status</th>
                </tr></thead>
                <tbody className="divide-y divide-slate-50">
                  {data.items.map((v: Vehicle) => (
                    <tr key={v._id} className="table-row">
                      <td className="table-cell"><div className="flex items-center gap-3"><div className="w-9 h-9 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center"><Car className="w-4 h-4" /></div><span className="font-mono font-semibold text-slate-800 text-sm">{v.vehicleNo}</span></div></td>
                      <td className="table-cell"><span className={cn('badge', typeColors[v.vehicleType] || 'badge-gray')}>{v.vehicleType}</span></td>
                      <td className="table-cell"><p className="text-sm text-slate-700">{[v.brand, v.model, v.color].filter(Boolean).join(' · ') || '—'}</p></td>
                      <td className="table-cell text-xs text-slate-500">{(v.flatId as any)?.flatNo || 'N/A'}</td>
                      <td className="table-cell"><span className={cn('badge', v.isBlacklisted ? 'badge-red' : v.entryAllowed ? 'badge-green' : 'badge-yellow')}>{v.isBlacklisted ? 'Blacklisted' : v.entryAllowed ? 'Allowed' : 'Blocked'}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Register Vehicle">
        <div className="space-y-4">
          <VoiceInputField label="Vehicle Number" value={form.vehicleNo} onChange={set('vehicleNo')} placeholder="MH01AB1234" required />
          <div><label className="label">Vehicle Type</label>
            <select value={form.vehicleType} onChange={(e) => set('vehicleType')(e.target.value)} className="input">
              {VEHICLE_TYPES.map((t) => <option key={t}>{t}</option>)}</select></div>
          <div className="grid grid-cols-2 gap-3">
            <VoiceInputField label="Brand" value={form.brand} onChange={set('brand')} placeholder="Maruti" />
            <VoiceInputField label="Model" value={form.model} onChange={set('model')} placeholder="Swift" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <VoiceInputField label="Color" value={form.color} onChange={set('color')} placeholder="White" />
            <VoiceInputField label="Parking Slot" value={form.parkingSlot} onChange={set('parkingSlot')} placeholder="P-101" />
          </div>
          <div><label className="label">Flat <span className="text-red-500">*</span></label>
            <select value={form.flatId} onChange={(e) => set('flatId')(e.target.value)} className="input" required>
              <option value="">Select flat...</option>
              {flats?.items?.map((f: any) => <option key={f._id} value={f._id}>{f.flatNo}</option>)}
            </select></div>
          <div className="flex gap-3 pt-2">
            <button onClick={() => mutation.mutate({ ...form, societyId })} disabled={mutation.isPending} className="btn-primary flex-1">{mutation.isPending ? 'Registering...' : 'Register Vehicle'}</button>
            <button onClick={() => setShowModal(false)} className="btn-secondary">Cancel</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
