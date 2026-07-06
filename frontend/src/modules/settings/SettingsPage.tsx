import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Settings, Bell, Globe, Shield, Save } from 'lucide-react';
import { api, extractData } from '../../services/api';
import { PageHeader } from '../../components/common/PageHeader';
import { useAuthStore } from '../../store/authStore';
import { useSocietyStore } from '../../store/societyStore';
import { Society } from '../../types';
import toast from 'react-hot-toast';

const TIMEZONES = ['Asia/Kolkata', 'Asia/Dubai', 'UTC', 'America/New_York', 'Europe/London'];
const CURRENCIES = ['INR', 'USD', 'AED', 'GBP', 'EUR'];

export function SettingsPage() {
  const { user } = useAuthStore();
  const { currentSociety, setCurrentSociety } = useSocietyStore();
  const queryClient = useQueryClient();
  const societyId = currentSociety?._id || user?.societyId || '';

  const isSuperAdmin = user?.roleCode === 'JENIX_SUPER_ADMIN';

  const { data: society } = useQuery({
    queryKey: ['society-detail', societyId],
    queryFn: () => extractData<Society>(api.get(`/societies/${societyId}`)),
    enabled: !!societyId && !isSuperAdmin,
  });

  const [societyForm, setSocietyForm] = useState({ timezone: society?.timezone || 'Asia/Kolkata', currency: society?.currency || 'INR', address: society?.address || '', city: society?.city || '', state: society?.state || '' });
  const [notifForm, setNotifForm] = useState({ emailNotif: true, smsNotif: true, pushNotif: true });

  const updateSocietyMutation = useMutation({
    mutationFn: (d: any) => extractData<Society>(api.patch(`/societies/${societyId}`, d)),
    onSuccess: (updated) => { setCurrentSociety(updated); queryClient.invalidateQueries({ queryKey: ['society-detail'] }); toast.success('Society settings saved!'); },
    onError: () => toast.error('Failed to save settings'),
  });

  const setSoc = (k: string) => (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => setSocietyForm(f => ({ ...f, [k]: e.target.value }));
  const setNotif = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) => setNotifForm(f => ({ ...f, [k]: e.target.checked }));

  return (
    <div className="space-y-6 max-w-2xl">
      <PageHeader title="Settings" subtitle="Configure platform and society preferences" />

      {!isSuperAdmin && societyId && (
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-5"><Globe className="w-4 h-4 text-slate-400" /><h3 className="font-semibold text-slate-700">Society Settings</h3></div>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><label className="label">Timezone</label>
                <select value={societyForm.timezone} onChange={setSoc('timezone')} className="input">
                  {TIMEZONES.map((tz) => <option key={tz}>{tz}</option>)}
                </select></div>
              <div><label className="label">Currency</label>
                <select value={societyForm.currency} onChange={setSoc('currency')} className="input">
                  {CURRENCIES.map((c) => <option key={c}>{c}</option>)}
                </select></div>
            </div>
            <div><label className="label">Address</label>
              <input type="text" value={societyForm.address} onChange={setSoc('address')} className="input" placeholder="123 Main Road" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="label">City</label><input type="text" value={societyForm.city} onChange={setSoc('city')} className="input" placeholder="Mumbai" /></div>
              <div><label className="label">State</label><input type="text" value={societyForm.state} onChange={setSoc('state')} className="input" placeholder="Maharashtra" /></div>
            </div>
            <button onClick={() => updateSocietyMutation.mutate(societyForm)} disabled={updateSocietyMutation.isPending} className="btn-primary flex items-center gap-2 text-sm">
              <Save className="w-4 h-4" />{updateSocietyMutation.isPending ? 'Saving...' : 'Save Society Settings'}
            </button>
          </div>
        </div>
      )}

      <div className="card p-6">
        <div className="flex items-center gap-2 mb-5"><Bell className="w-4 h-4 text-slate-400" /><h3 className="font-semibold text-slate-700">Notification Preferences</h3></div>
        <div className="space-y-3">
          {[{ key: 'emailNotif', label: 'Email Notifications', desc: 'Receive alerts via email' }, { key: 'smsNotif', label: 'SMS Notifications', desc: 'Receive alerts via SMS' }, { key: 'pushNotif', label: 'Push Notifications', desc: 'Browser & mobile push alerts' }].map(({ key, label, desc }) => (
            <label key={key} className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 cursor-pointer">
              <div>
                <p className="text-sm font-medium text-slate-700">{label}</p>
                <p className="text-xs text-slate-500">{desc}</p>
              </div>
              <input type="checkbox" checked={notifForm[key as keyof typeof notifForm]} onChange={setNotif(key)} className="w-5 h-5 text-indigo-600 rounded" />
            </label>
          ))}
        </div>
        <button onClick={() => toast.success('Notification preferences saved!')} className="btn-primary flex items-center gap-2 text-sm mt-4">
          <Save className="w-4 h-4" />Save Preferences
        </button>
      </div>

      <div className="card p-6">
        <div className="flex items-center gap-2 mb-5"><Shield className="w-4 h-4 text-slate-400" /><h3 className="font-semibold text-slate-700">Security</h3></div>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50">
            <div><p className="text-sm font-medium text-slate-700">Two-Factor Authentication</p><p className="text-xs text-slate-500">Adds an extra layer of security</p></div>
            <span className="badge badge-yellow">Coming Soon</span>
          </div>
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50">
            <div><p className="text-sm font-medium text-slate-700">Session Management</p><p className="text-xs text-slate-500">View and revoke active sessions</p></div>
            <span className="badge badge-yellow">Coming Soon</span>
          </div>
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50">
            <div><p className="text-sm font-medium text-slate-700">IP Whitelisting</p><p className="text-xs text-slate-500">Restrict access by IP address</p></div>
            <span className="badge badge-yellow">Coming Soon</span>
          </div>
        </div>
      </div>
    </div>
  );
}
