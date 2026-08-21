import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Users, Link2, Unlink } from 'lucide-react';
import toast from 'react-hot-toast';
import { api, extractData } from '../../services/api';
import { PageHeader } from '../../components/common/PageHeader';
import { Modal } from '../../components/common/Modal';
import { EmptyState } from '../../components/common/EmptyState';
import { useAuthStore } from '../../store/authStore';
import { useSocietyStore } from '../../store/societyStore';
import { cn } from '../../utils/cn';
import { Resident, User } from '../../types';
import { useTerminology } from '../../utils/terminology';

interface ParentWardLink {
  _id: string;
  userId: User | string;
  residentIds: (Resident | string)[];
  isActive: boolean;
  createdAt: string;
}

const BLANK_NEW_PARENT = { name: '', email: '', mobile: '', password: '' };

export function ParentLinksAdminPage() {
  const { user } = useAuthStore();
  const { currentSociety } = useSocietyStore();
  const societyId = currentSociety?._id || user?.societyId || '';
  const queryClient = useQueryClient();
  const terms = useTerminology();

  const [showModal, setShowModal] = useState(false);
  const [mode, setMode] = useState<'new' | 'existing'>('new');
  const [newParent, setNewParent] = useState(BLANK_NEW_PARENT);
  const [existingParentId, setExistingParentId] = useState('');
  const [residentIds, setResidentIds] = useState<string[]>([]);
  const [residentSearch, setResidentSearch] = useState('');

  const { data: links, isLoading } = useQuery({
    queryKey: ['parent-ward-links', societyId],
    queryFn: () => extractData<ParentWardLink[]>(api.get(`/parent-ward-links/society/${societyId}`)),
    enabled: !!societyId,
  });

  const { data: usersRes } = useQuery({
    queryKey: ['users-society', societyId],
    queryFn: () => extractData<User[]>(api.get(`/users/society/${societyId}`)),
    enabled: !!societyId && showModal,
  });
  const existingParents = (usersRes || []).filter((u) => u.roleCode === 'PARENT');

  const { data: residentsRes } = useQuery({
    queryKey: ['residents-society', societyId],
    queryFn: () => extractData<any>(api.get(`/residents/society/${societyId}?limit=200`)),
    enabled: !!societyId && showModal,
  });
  const residentOptions: Resident[] = residentsRes?.items || [];
  const filteredResidents = residentSearch
    ? residentOptions.filter((r) => r.name.toLowerCase().includes(residentSearch.toLowerCase()))
    : residentOptions;

  const resetForm = () => {
    setMode('new');
    setNewParent(BLANK_NEW_PARENT);
    setExistingParentId('');
    setResidentIds([]);
    setResidentSearch('');
  };

  const createLinkMutation = useMutation({
    mutationFn: async () => {
      let parentUserId = existingParentId;
      if (mode === 'new') {
        const created = await extractData<User>(
          api.post('/users', { ...newParent, roleCode: 'PARENT', societyId })
        );
        parentUserId = created._id;
      }
      return api.post('/parent-ward-links', { societyId, userId: parentUserId, residentIds });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['parent-ward-links'] });
      setShowModal(false);
      resetForm();
      toast.success('Parent linked to ward(s)!');
    },
    onError: (err: any) => toast.error(err?.response?.data?.error?.message || 'Failed to create link'),
  });

  const disableLinkMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/parent-ward-links/${id}/disable`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['parent-ward-links'] });
      toast.success('Link removed');
    },
  });

  const toggleResident = (id: string) =>
    setResidentIds((prev) => (prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id]));

  const canSubmit =
    residentIds.length > 0 &&
    (mode === 'new'
      ? newParent.name && newParent.email && newParent.mobile && newParent.password
      : !!existingParentId);

  const residentName = (r: Resident | string) => (typeof r === 'object' ? r.name : '—');
  const parentName = (u: User | string) => (typeof u === 'object' ? u.name : '—');
  const parentContact = (u: User | string) => (typeof u === 'object' ? u.email : '');

  return (
    <div className="space-y-6">
      <PageHeader
        title={terms.parentLinkTitle}
        subtitle={terms.parentLinkSubtitle}
        action={
          <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" /> Add {terms.parentLinkTitle.replace(/s$/, '')}
          </button>
        }
      />

      {isLoading ? (
        <div className="card p-8 text-center text-slate-400 text-sm">Loading...</div>
      ) : !links?.length ? (
        <EmptyState
          icon={Users}
          title={`No ${terms.parentLinkTitle.toLowerCase()} yet`}
          description={`Link a parent's login to a ${terms.ward.toLowerCase()} so they can receive gate-entry alerts and view access history for them.`}
          action={<button onClick={() => setShowModal(true)} className="btn-primary">Add {terms.parentLinkTitle.replace(/s$/, '')}</button>}
        />
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="table-header text-left">Parent</th>
                  <th className="table-header text-left">{terms.ward}(s)</th>
                  <th className="table-header text-left">Status</th>
                  <th className="table-header text-left">Linked</th>
                  <th className="table-header text-left">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {links.map((link) => (
                  <tr key={link._id} className="table-row">
                    <td className="table-cell">
                      <p className="font-medium text-slate-800 text-sm">{parentName(link.userId)}</p>
                      <p className="text-xs text-slate-500">{parentContact(link.userId)}</p>
                    </td>
                    <td className="table-cell">
                      <div className="flex flex-wrap gap-1">
                        {link.residentIds.map((r, i) => (
                          <span key={i} className="badge badge-gray text-xs">{residentName(r)}</span>
                        ))}
                      </div>
                    </td>
                    <td className="table-cell">
                      <span className={cn('badge', link.isActive ? 'badge-green' : 'badge-gray')}>
                        {link.isActive ? 'Active' : 'Disabled'}
                      </span>
                    </td>
                    <td className="table-cell text-xs text-slate-500">
                      {new Date(link.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="table-cell">
                      {link.isActive && (
                        <button
                          onClick={() => disableLinkMutation.mutate(link._id)}
                          className="text-red-600 hover:text-red-700 text-xs font-medium flex items-center gap-1"
                        >
                          <Unlink className="w-3.5 h-3.5" /> Remove
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal isOpen={showModal} onClose={() => { setShowModal(false); resetForm(); }} title={`Add ${terms.parentLinkTitle.replace(/s$/, '')}`}>
        <div className="space-y-4">
          <div className="flex gap-2 p-1 bg-slate-100 rounded-xl">
            <button
              type="button"
              onClick={() => setMode('new')}
              className={cn('flex-1 py-2 rounded-lg text-sm font-medium transition-colors', mode === 'new' ? 'bg-white shadow-sm text-primary-700' : 'text-slate-500')}
            >
              Create New Parent
            </button>
            <button
              type="button"
              onClick={() => setMode('existing')}
              className={cn('flex-1 py-2 rounded-lg text-sm font-medium transition-colors', mode === 'existing' ? 'bg-white shadow-sm text-primary-700' : 'text-slate-500')}
            >
              Use Existing Parent
            </button>
          </div>

          {mode === 'new' ? (
            <div className="space-y-3">
              <div>
                <label className="label">Full Name <span className="text-red-500">*</span></label>
                <input value={newParent.name} onChange={(e) => setNewParent((f) => ({ ...f, name: e.target.value }))} className="input" placeholder="Parent's name" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Email <span className="text-red-500">*</span></label>
                  <input type="email" value={newParent.email} onChange={(e) => setNewParent((f) => ({ ...f, email: e.target.value }))} className="input" />
                </div>
                <div>
                  <label className="label">Mobile <span className="text-red-500">*</span></label>
                  <input type="tel" value={newParent.mobile} onChange={(e) => setNewParent((f) => ({ ...f, mobile: e.target.value }))} className="input" />
                </div>
              </div>
              <div>
                <label className="label">Password <span className="text-red-500">*</span></label>
                <input type="password" value={newParent.password} onChange={(e) => setNewParent((f) => ({ ...f, password: e.target.value }))} className="input" placeholder="Min 8 characters" />
              </div>
            </div>
          ) : (
            <div>
              <label className="label">Existing Parent <span className="text-red-500">*</span></label>
              <select value={existingParentId} onChange={(e) => setExistingParentId(e.target.value)} className="input">
                <option value="">Select parent...</option>
                {existingParents.map((p) => (
                  <option key={p._id} value={p._id}>{p.name} ({p.email})</option>
                ))}
              </select>
              {existingParents.length === 0 && (
                <p className="mt-1 text-xs text-slate-400">No existing parent accounts in this society yet — use "Create New Parent" instead.</p>
              )}
            </div>
          )}

          <div>
            <label className="label flex items-center gap-1.5"><Link2 className="w-3.5 h-3.5" /> {terms.ward}(s) <span className="text-red-500">*</span></label>
            <input
              value={residentSearch}
              onChange={(e) => setResidentSearch(e.target.value)}
              placeholder={`Search ${terms.ward.toLowerCase()} by name...`}
              className="input mb-2"
            />
            <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto p-1">
              {filteredResidents.length === 0 && <p className="text-xs text-slate-400">No residents found</p>}
              {filteredResidents.map((r) => (
                <button
                  key={r._id}
                  type="button"
                  onClick={() => toggleResident(r._id)}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-xs font-medium border',
                    residentIds.includes(r._id) ? 'bg-primary-50 border-primary-300 text-primary-700' : 'border-slate-200 text-slate-600'
                  )}
                >
                  {r.name}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button onClick={() => createLinkMutation.mutate()} disabled={createLinkMutation.isPending || !canSubmit} className="btn-primary flex-1">
              {createLinkMutation.isPending ? 'Saving...' : 'Create Link'}
            </button>
            <button onClick={() => { setShowModal(false); resetForm(); }} className="btn-secondary">Cancel</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
