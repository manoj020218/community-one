import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Users, Phone, Home } from 'lucide-react';
import { api, extractData } from '../../services/api';
import { PageHeader } from '../../components/common/PageHeader';
import { EmptyState } from '../../components/common/EmptyState';
import { Modal } from '../../components/common/Modal';
import { VoiceInputField } from '../../components/common/VoiceInputField';
import { TableSkeleton } from '../../components/common/LoadingSkeleton';
import { useAuthStore } from '../../store/authStore';
import { useSocietyStore } from '../../store/societyStore';
import { Resident } from '../../types';
import toast from 'react-hot-toast';

const MEMBER_TYPES = ['OWNER', 'TENANT', 'FAMILY_MEMBER', 'STAFF', 'VENDOR'];

export function ResidentPage() {
  const { user } = useAuthStore();
  const { currentSociety } = useSocietyStore();
  const societyId = currentSociety?._id || user?.societyId || '';
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ societyId, flatId: '', name: '', mobile: '', email: '', memberType: 'OWNER', primaryContact: true, loginAllowed: false });

  const { data: flats } = useQuery({ queryKey: ['flats-list', societyId], queryFn: () => extractData<any>(api.get(`/flats/society/${societyId}?limit=200`)), enabled: !!societyId });

  const { data, isLoading } = useQuery({
    queryKey: ['residents', societyId, page, search],
    queryFn: () => extractData<any>(api.get(`/residents/society/${societyId}?page=${page}&limit=20${search ? `&search=${search}` : ''}`)),
    enabled: !!societyId,
  });

  const mutation = useMutation({
    mutationFn: (data: any) => api.post('/residents', data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['residents'] }); setShowModal(false); toast.success('Resident added!'); },
  });

  const set = (k: string) => (v: string | boolean) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <div className="space-y-6">
      <PageHeader title="Residents" subtitle="Manage all members, owners, and tenants"
        action={<button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2"><Plus className="w-4 h-4" /> Add Resident</button>} />

      <div className="card p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input placeholder="Search by name, mobile, email..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="input pl-10" />
        </div>
      </div>

      {isLoading ? <TableSkeleton rows={6} cols={5} /> : (
        <div className="card overflow-hidden">
          {!data?.items?.length ? (
            <EmptyState icon={Users} title="No residents yet" description="Add your first resident to get started"
              action={<button onClick={() => setShowModal(true)} className="btn-primary">Add Resident</button>} />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead><tr className="border-b border-slate-100">
                  <th className="table-header text-left">Resident</th>
                  <th className="table-header text-left">Contact</th>
                  <th className="table-header text-left">Flat</th>
                  <th className="table-header text-left">Type</th>
                  <th className="table-header text-left">KYC</th>
                </tr></thead>
                <tbody className="divide-y divide-slate-50">
                  {data.items.map((r: Resident) => (
                    <tr key={r._id} className="table-row">
                      <td className="table-cell">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-xl flex items-center justify-center text-white text-sm font-bold">{r.name[0]}</div>
                          <div><p className="font-semibold text-slate-800 text-sm">{r.name}</p>{r.email && <p className="text-xs text-slate-500">{r.email}</p>}</div>
                        </div>
                      </td>
                      <td className="table-cell"><div className="flex items-center gap-1 text-xs text-slate-600"><Phone className="w-3 h-3 text-slate-400" />{r.mobile}</div></td>
                      <td className="table-cell"><div className="flex items-center gap-1 text-xs"><Home className="w-3 h-3 text-slate-400" />{(r.flatId as any)?.flatNo || 'N/A'}</div></td>
                      <td className="table-cell"><span className={`badge ${r.memberType === 'OWNER' ? 'badge-blue' : r.memberType === 'TENANT' ? 'badge-purple' : 'badge-gray'}`}>{r.memberType}</span></td>
                      <td className="table-cell"><span className={`badge ${r.kycStatus === 'VERIFIED' ? 'badge-green' : r.kycStatus === 'PENDING' ? 'badge-yellow' : 'badge-gray'}`}>{r.kycStatus}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Add Resident">
        <div className="space-y-4">
          <VoiceInputField label="Full Name" value={form.name} onChange={(v) => set('name')(v)} placeholder="Raj Sharma" required />
          <VoiceInputField label="Mobile" value={form.mobile} onChange={(v) => set('mobile')(v)} placeholder="9876543210" required type="tel" />
          <VoiceInputField label="Email" value={form.email} onChange={(v) => set('email')(v)} placeholder="raj@example.com" type="email" />
          <div><label className="label">Flat <span className="text-red-500">*</span></label>
            <select value={form.flatId} onChange={(e) => set('flatId')(e.target.value)} className="input" required>
              <option value="">Select flat...</option>
              {flats?.items?.map((f: any) => <option key={f._id} value={f._id}>{f.flatNo}</option>)}
            </select></div>
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
              Allow Login
            </label>
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={() => mutation.mutate({ ...form, societyId })} disabled={mutation.isPending} className="btn-primary flex-1">{mutation.isPending ? 'Adding...' : 'Add Resident'}</button>
            <button onClick={() => setShowModal(false)} className="btn-secondary">Cancel</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
