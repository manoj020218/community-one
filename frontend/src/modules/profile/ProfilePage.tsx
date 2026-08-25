import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { User, Lock, Camera } from 'lucide-react';
import { api } from '../../services/api';
import { PageHeader } from '../../components/common/PageHeader';
import { VoiceInputField } from '../../components/common/VoiceInputField';
import { GoogleLinkedAccountCard } from './GoogleLinkedAccountCard';
import { useAuthStore } from '../../store/authStore';
import { getInitials } from '../../utils/cn';
import toast from 'react-hot-toast';

// Mirrors backend/src/common/utils/password.ts's validateCredentialStrength.
const PIN_ROLES = ['OWNER', 'TENANT', 'FAMILY_MEMBER'];

export function ProfilePage() {
  const { user, updateUser } = useAuthStore();
  const [nameForm, setNameForm] = useState({ name: user?.name || '' });
  const [passForm, setPassForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [showPass, setShowPass] = useState(false);
  const isPinAccount = PIN_ROLES.includes(user?.roleCode || '');

  const updateMutation = useMutation({
    mutationFn: (d: any) => api.patch('/users/me', d),
    onSuccess: (res) => { updateUser(res.data.data); toast.success('Profile updated!'); },
    onError: () => toast.error('Update failed'),
  });

  const passMutation = useMutation({
    mutationFn: (d: any) => api.post('/auth/change-password', d),
    onSuccess: () => { toast.success('Password changed!'); setPassForm({ currentPassword: '', newPassword: '', confirmPassword: '' }); },
    onError: () => toast.error('Password change failed — check your current password'),
  });

  const handlePassSubmit = () => {
    if (passForm.newPassword !== passForm.confirmPassword) { toast.error('Passwords do not match'); return; }
    if (isPinAccount ? !/^\d{4,6}$/.test(passForm.newPassword) : passForm.newPassword.length < 8) {
      toast.error(isPinAccount ? 'PIN must be 4 to 6 digits' : 'Password must be at least 8 characters');
      return;
    }
    passMutation.mutate({ currentPassword: passForm.currentPassword, newPassword: passForm.newPassword });
  };

  const setPass = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) => setPassForm(f => ({ ...f, [k]: e.target.value }));

  return (
    <div className="space-y-6 max-w-2xl">
      <PageHeader title="My Profile" subtitle="Manage your account information" />

      <div className="card p-6">
        <div className="flex items-center gap-5 mb-6">
          <div className="relative">
            <div className="w-20 h-20 bg-gradient-to-br from-indigo-400 to-purple-500 rounded-2xl flex items-center justify-center text-white text-2xl font-bold shadow-lg">
              {getInitials(user?.name || 'U')}
            </div>
            <button className="absolute -bottom-1 -right-1 w-7 h-7 bg-white rounded-full shadow-md border border-slate-200 flex items-center justify-center text-slate-500 hover:text-indigo-600 transition-colors">
              <Camera className="w-3.5 h-3.5" />
            </button>
          </div>
          <div>
            <h2 className="text-xl font-semibold text-slate-800">{user?.name}</h2>
            <p className="text-sm text-slate-500">{user?.email || user?.mobile}</p>
            <span className="badge badge-purple mt-1">{user?.roleCode?.replace(/_/g, ' ')}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-xl mb-6">
          <div><p className="text-xs text-slate-500 mb-0.5">Email</p><p className="text-sm font-medium text-slate-700">{user?.email || '—'}</p></div>
          <div><p className="text-xs text-slate-500 mb-0.5">Mobile</p><p className="text-sm font-medium text-slate-700">{user?.mobile || '—'}</p></div>
          <div><p className="text-xs text-slate-500 mb-0.5">Role</p><p className="text-sm font-medium text-slate-700">{user?.roleCode}</p></div>
          <div><p className="text-xs text-slate-500 mb-0.5">Permissions</p><p className="text-sm font-medium text-slate-700">{user?.permissions?.length || 0} permissions</p></div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-2 mb-2"><User className="w-4 h-4 text-slate-400" /><h3 className="font-semibold text-slate-700 text-sm">Update Name</h3></div>
          <VoiceInputField label="Display Name" value={nameForm.name} onChange={(v) => setNameForm({ name: v })} placeholder="Your name" />
          <button onClick={() => updateMutation.mutate({ name: nameForm.name })} disabled={updateMutation.isPending || !nameForm.name} className="btn-primary text-sm">
            {updateMutation.isPending ? 'Saving...' : 'Save Name'}
          </button>
        </div>
      </div>

      <div className="card p-6">
        <div className="flex items-center gap-2 mb-4"><Lock className="w-4 h-4 text-slate-400" /><h3 className="font-semibold text-slate-700 text-sm">Change {isPinAccount ? 'PIN' : 'Password'}</h3></div>
        <div className="space-y-3">
          <div><label className="label">Current {isPinAccount ? 'PIN' : 'Password'}</label>
            <input type={showPass ? 'text' : 'password'} value={passForm.currentPassword} onChange={setPass('currentPassword')} className="input" placeholder="••••••••" /></div>
          <div><label className="label">New {isPinAccount ? 'PIN' : 'Password'}</label>
            <input
              type={showPass ? 'text' : 'password'}
              inputMode={isPinAccount ? 'numeric' : undefined}
              maxLength={isPinAccount ? 6 : undefined}
              value={passForm.newPassword}
              onChange={setPass('newPassword')}
              className="input"
              placeholder={isPinAccount ? '4-6 digit PIN' : 'Min. 8 characters'}
            /></div>
          <div><label className="label">Confirm New {isPinAccount ? 'PIN' : 'Password'}</label>
            <input type={showPass ? 'text' : 'password'} value={passForm.confirmPassword} onChange={setPass('confirmPassword')} className="input" placeholder="Re-enter" /></div>
          <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
            <input type="checkbox" checked={showPass} onChange={(e) => setShowPass(e.target.checked)} className="w-4 h-4" />Show {isPinAccount ? 'PIN' : 'passwords'}
          </label>
          <button onClick={handlePassSubmit} disabled={passMutation.isPending || !passForm.currentPassword || !passForm.newPassword} className="btn-primary text-sm">
            {passMutation.isPending ? 'Changing...' : `Change ${isPinAccount ? 'PIN' : 'Password'}`}
          </button>
        </div>
      </div>

      <GoogleLinkedAccountCard />
    </div>
  );
}
