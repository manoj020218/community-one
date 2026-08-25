import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Settings2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { api, extractData } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { useSocietyStore } from '../../store/societyStore';
import { ALERT_SOUNDS, PatrolSettings } from './guardPatrol.types';

export function PatrolSettingsTab() {
  const { user } = useAuthStore();
  const { currentSociety } = useSocietyStore();
  const societyId = currentSociety?._id || user?.societyId || '';
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ defaultAlertThresholdMinutes: 5, defaultAlertSoundKey: 'chime' });

  const { data: settings } = useQuery({
    queryKey: ['patrol-settings', societyId],
    queryFn: () => extractData<PatrolSettings>(api.get('/guard-patrol/settings', { params: { societyId } })),
    enabled: !!societyId,
  });

  useEffect(() => {
    if (settings) setForm({ defaultAlertThresholdMinutes: settings.defaultAlertThresholdMinutes, defaultAlertSoundKey: settings.defaultAlertSoundKey });
  }, [settings]);

  const updateMutation = useMutation({
    mutationFn: () => api.patch('/guard-patrol/settings', form, { params: { societyId } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patrol-settings'] });
      toast.success('Settings saved');
    },
  });

  return (
    <div className="card p-5 space-y-4 max-w-md">
      <div className="flex items-center gap-2"><Settings2 className="w-4 h-4 text-slate-400" /><h3 className="font-semibold text-slate-800 text-sm">Patrol Settings</h3></div>
      <div>
        <label className="label">Default Alert Threshold <span className="text-slate-400 font-normal">(minutes)</span></label>
        <input type="number" min={1} value={form.defaultAlertThresholdMinutes} onChange={(e) => setForm((f) => ({ ...f, defaultAlertThresholdMinutes: Number(e.target.value) }))} className="input" />
        <p className="mt-1 text-xs text-slate-400">A guard's phone alerts if this much time passes without a checkpoint scan. Individual routes can override this.</p>
      </div>
      <div>
        <label className="label">Alert Sound</label>
        <select value={form.defaultAlertSoundKey} onChange={(e) => setForm((f) => ({ ...f, defaultAlertSoundKey: e.target.value }))} className="input">
          {ALERT_SOUNDS.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
        </select>
      </div>
      <button onClick={() => updateMutation.mutate()} disabled={updateMutation.isPending} className="btn-primary">
        {updateMutation.isPending ? 'Saving...' : 'Save Settings'}
      </button>
    </div>
  );
}
