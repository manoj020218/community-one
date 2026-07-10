import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, UserCog, Mail, Phone, Shield, CheckCircle2, XCircle, Eye, EyeOff } from 'lucide-react';
import { api, extractData } from '../../services/api';
import { PageHeader } from '../../components/common/PageHeader';
import { EmptyState } from '../../components/common/EmptyState';
import { Modal } from '../../components/common/Modal';
import { TableSkeleton } from '../../components/common/LoadingSkeleton';
import { useAuthStore } from '../../store/authStore';
import { useSocietyStore } from '../../store/societyStore';
import { User } from '../../types';
import toast from 'react-hot-toast';

// Lower number = higher authority
const ROLE_RANK: Record<string, number> = {
  JENIX_SUPER_ADMIN: 1,
  JENIX_SUPPORT: 2,
  SOCIETY_ADMIN: 10,
  COMMITTEE_MEMBER: 20,
  ACCOUNTANT: 21,
  FACILITY_MANAGER: 22,
  SECURITY_GUARD: 30,
  OWNER: 40,
  TENANT: 41,
  FAMILY_MEMBER: 50,
  VENDOR: 51,
  STAFF: 52,
};

const ROLE_LABELS: Record<string, string> = {
  JENIX_SUPER_ADMIN: 'Super Admin',
  JENIX_SUPPORT: 'Jenix Support',
  SOCIETY_ADMIN: 'Society Admin',
  COMMITTEE_MEMBER: 'Committee Member',
  ACCOUNTANT: 'Accountant',
  FACILITY_MANAGER: 'Facility Manager',
  SECURITY_GUARD: 'Security Guard',
  OWNER: 'Owner',
  TENANT: 'Tenant',
  FAMILY_MEMBER: 'Family Member',
  VENDOR: 'Vendor',
  STAFF: 'Staff',
};

const ROLE_BADGE: Record<string, string> = {
  JENIX_SUPER_ADMIN: 'badge-red',
  JENIX_SUPPORT: 'badge-purple',
  SOCIETY_ADMIN: 'badge-blue',
  COMMITTEE_MEMBER: 'badge-indigo',
  ACCOUNTANT: 'badge-indigo',
  FACILITY_MANAGER: 'badge-indigo',
  SECURITY_GUARD: 'badge-yellow',
  OWNER: 'badge-green',
  TENANT: 'badge-teal',
  FAMILY_MEMBER: 'badge-gray',
  VENDOR: 'badge-gray',
  STAFF: 'badge-gray',
};

const ALL_ROLES = Object.keys(ROLE_RANK);

const BLANK_FORM = { name: '', email: '', mobile: '', password: '', roleCode: '', societyId: '' };

export function UsersPage() {
  const { user: currentUser } = useAuthStore();
  const { currentSociety } = useSocietyStore();
  const societyId = currentSociety?._id || currentUser?.societyId || '';
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({ ...BLANK_FORM, societyId });

  const myRank = ROLE_RANK[currentUser?.roleCode || ''] ?? 0;
  const creatableRoles = ALL_ROLES.filter((r) => ROLE_RANK[r] > myRank);

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['users', societyId],
    queryFn: () => extractData<User[]>(api.get(`/users/society/${societyId}`)),
    enabled: !!societyId,
  });

  const mutation = useMutation({
    mutationFn: (data: any) => api.post('/users', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setShowModal(false);
      setForm({ ...BLANK_FORM, societyId });
      toast.success('User created!');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error?.message || 'Failed to create user');
    },
  });

  const filtered = search
    ? users.filter((u) =>
        u.name.toLowerCase().includes(search.toLowerCase()) ||
        u.email.toLowerCase().includes(search.toLowerCase()) ||
        u.mobile.includes(search)
      )
    : users;

  const set = (k: string) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = () => {
    if (!form.name || !form.email || !form.mobile || !form.password || !form.roleCode) {
      toast.error('All fields are required');
      return;
    }
    mutation.mutate({ ...form, societyId });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Users"
        subtitle="Manage system users · create and view accounts by role"
        action={
          creatableRoles.length > 0 ? (
            <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2">
              <Plus className="w-4 h-4" /> Add User
            </button>
          ) : undefined
        }
      />

      <div className="card p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            placeholder="Search by name, email, mobile..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-10"
          />
        </div>
      </div>

      {/* Role hierarchy info */}
      <div className="card p-4 bg-slate-50 border-slate-100">
        <p className="text-xs text-slate-500">
          <span className="font-medium text-slate-600">Your role:</span>{' '}
          {ROLE_LABELS[currentUser?.roleCode || ''] || currentUser?.roleCode} (rank {myRank}) ·{' '}
          You can create:{' '}
          {creatableRoles.length > 0
            ? creatableRoles.map((r) => ROLE_LABELS[r]).join(', ')
            : 'No lower-rank roles available'}
        </p>
      </div>

      {isLoading ? (
        <TableSkeleton rows={6} cols={5} />
      ) : (
        <div className="card overflow-hidden">
          {filtered.length === 0 ? (
            <EmptyState
              icon={UserCog}
              title={search ? 'No users match your search' : 'No users yet'}
              description={search ? 'Try a different search term' : 'Create the first user for this society'}
              action={
                !search && creatableRoles.length > 0 ? (
                  <button onClick={() => setShowModal(true)} className="btn-primary">Add User</button>
                ) : undefined
              }
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="table-header text-left">User</th>
                    <th className="table-header text-left">Contact</th>
                    <th className="table-header text-left">Role</th>
                    <th className="table-header text-left">Status</th>
                    <th className="table-header text-left">Last Login</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filtered.map((u: User) => (
                    <tr key={u._id} className="table-row">
                      <td className="table-cell">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 bg-gradient-to-br from-indigo-400 to-purple-500 rounded-xl flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                            {u.name[0]}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-800 text-sm">{u.name}</p>
                            <div className="flex items-center gap-1 text-xs text-slate-500">
                              <Mail className="w-3 h-3" />
                              {u.email}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="table-cell">
                        <div className="flex items-center gap-1 text-xs text-slate-600">
                          <Phone className="w-3 h-3 text-slate-400" />
                          {u.mobile}
                        </div>
                      </td>
                      <td className="table-cell">
                        <div className="flex items-center gap-1.5">
                          <Shield className="w-3 h-3 text-slate-400" />
                          <span className={`badge text-xs ${ROLE_BADGE[u.roleCode] || 'badge-gray'}`}>
                            {ROLE_LABELS[u.roleCode] || u.roleCode}
                          </span>
                        </div>
                      </td>
                      <td className="table-cell">
                        {u.isActive ? (
                          <div className="flex items-center gap-1 text-xs text-emerald-600">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Active
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 text-xs text-red-500">
                            <XCircle className="w-3.5 h-3.5" /> Inactive
                          </div>
                        )}
                      </td>
                      <td className="table-cell text-xs text-slate-500">
                        {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Add User Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Add User">
        <div className="space-y-4">
          <div className="p-3 bg-primary-50 rounded-xl text-xs text-primary-700">
            You can create users with a lower authority level than your own role.
          </div>

          <div>
            <label className="label">Full Name <span className="text-red-500">*</span></label>
            <input value={form.name} onChange={(e) => set('name')(e.target.value)} placeholder="Rahul Sharma" className="input" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Email <span className="text-red-500">*</span></label>
              <input type="email" value={form.email} onChange={(e) => set('email')(e.target.value)} placeholder="rahul@example.com" className="input" />
            </div>
            <div>
              <label className="label">Mobile <span className="text-red-500">*</span></label>
              <input type="tel" value={form.mobile} onChange={(e) => set('mobile')(e.target.value)} placeholder="9876543210" className="input" />
            </div>
          </div>

          <div>
            <label className="label">Password <span className="text-red-500">*</span></label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={form.password}
                onChange={(e) => set('password')(e.target.value)}
                placeholder="Min 8 characters"
                className="input pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="label">Role <span className="text-red-500">*</span></label>
            <select value={form.roleCode} onChange={(e) => set('roleCode')(e.target.value)} className="input">
              <option value="">Select role...</option>
              {creatableRoles.map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABELS[r]} (rank {ROLE_RANK[r]})
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-slate-400">Only roles below your authority level are shown</p>
          </div>

          <div className="flex gap-3 pt-2">
            <button onClick={handleSubmit} disabled={mutation.isPending} className="btn-primary flex-1">
              {mutation.isPending ? 'Creating...' : 'Create User'}
            </button>
            <button onClick={() => setShowModal(false)} className="btn-secondary">Cancel</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
