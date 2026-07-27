import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Cable, Save, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { api, extractData } from '../../services/api';
import { EmptyState } from '../../components/common/EmptyState';
import { TableSkeleton } from '../../components/common/LoadingSkeleton';
import { useAuthStore } from '../../store/authStore';
import { useSocietyStore } from '../../store/societyStore';
import { cn, formatDateTime } from '../../utils/cn';
import { PaginatedResult, SAMA_SYNC_TYPES, SamaSourceConfig, SamaSyncRun } from './sama.types';

const BLANK_FORM = { baseUrl: '', apiPrefix: '', accessToken: '', isActive: true, syncScheduleEnabled: false, syncIntervalMinutes: 60, scheduledSyncTypes: [] as string[] };

const SYNC_ENDPOINTS: Array<{ key: string; label: string; path: string }> = [
  { key: 'EMPLOYEES', label: 'Employees', path: '/sama/sync/employees' },
  { key: 'ATTENDANCE', label: 'Attendance', path: '/sama/sync/attendance' },
  { key: 'LEAVES', label: 'Leaves', path: '/sama/sync/leaves' },
  { key: 'SHIFTS', label: 'Shifts', path: '/sama/sync/shifts' },
  { key: 'PAYROLL', label: 'Payroll', path: '/sama/sync/payroll' },
  { key: 'ACCESS_EVENTS', label: 'Access Events', path: '/sama/sync/access-events' },
];

export function SamaBridgeTab() {
  const { user } = useAuthStore();
  const { currentSociety } = useSocietyStore();
  const societyId = currentSociety?._id || user?.societyId || '';
  const queryClient = useQueryClient();
  const [form, setForm] = useState(BLANK_FORM);
  const [clearToken, setClearToken] = useState(false);

  const { data: source } = useQuery({
    queryKey: ['sama-source', societyId],
    queryFn: () => extractData<SamaSourceConfig>(api.get('/sama/source', { params: { societyId } })),
    enabled: !!societyId,
  });

  const { data: syncRuns } = useQuery({
    queryKey: ['sama-sync-runs', societyId],
    queryFn: () => extractData<PaginatedResult<SamaSyncRun>>(api.get('/sama/sync-runs', { params: { societyId, limit: 20 } })),
    enabled: !!societyId,
  });

  useEffect(() => {
    if (source?.configured) {
      setForm((f) => ({
        ...f, baseUrl: source.baseUrl || '', apiPrefix: source.apiPrefix || '',
        isActive: !!source.isActive, syncScheduleEnabled: !!source.syncScheduleEnabled,
        syncIntervalMinutes: source.syncIntervalMinutes || 60, scheduledSyncTypes: source.scheduledSyncTypes || [],
      }));
    }
  }, [source]);

  const saveMutation = useMutation({
    mutationFn: () => api.patch('/sama/source', {
      societyId, baseUrl: form.baseUrl || undefined, apiPrefix: form.apiPrefix || undefined,
      accessToken: form.accessToken || undefined, clearAccessToken: clearToken || undefined,
      isActive: form.isActive, syncScheduleEnabled: form.syncScheduleEnabled,
      syncIntervalMinutes: form.syncIntervalMinutes, scheduledSyncTypes: form.scheduledSyncTypes.length ? form.scheduledSyncTypes : undefined,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sama-source'] });
      setForm((f) => ({ ...f, accessToken: '' }));
      setClearToken(false);
      toast.success('EdgeFolio source saved');
    },
  });

  const syncMutation = useMutation({
    mutationFn: (path: string) => api.post(path, { societyId }),
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ['sama-sync-runs'] });
      const d = res.data?.data;
      toast.success(d?.importedCount !== undefined ? `Synced — ${d.createdCount || 0} created, ${d.updatedCount || 0} updated` : 'Sync complete');
    },
  });

  const runDueMutation = useMutation({
    mutationFn: () => api.post('/sama/sync/run-due', { societyId }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['sama-sync-runs'] }); toast.success('Due syncs executed'); },
  });

  const toggleSyncType = (t: string) => setForm((f) => ({ ...f, scheduledSyncTypes: f.scheduledSyncTypes.includes(t) ? f.scheduledSyncTypes.filter((x) => x !== t) : [...f.scheduledSyncTypes, t] }));

  return (
    <div className="space-y-6">
      <div className="card p-6 max-w-2xl">
        <div className="flex items-center gap-2 mb-5"><Cable className="w-4 h-4 text-slate-400" /><h3 className="font-semibold text-slate-700">EdgeFolio Source</h3></div>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div><label className="label">Base URL</label>
              <input value={form.baseUrl} onChange={(e) => setForm((f) => ({ ...f, baseUrl: e.target.value }))} className="input" placeholder="https://edgefolio.example.com" /></div>
            <div><label className="label">API Prefix</label>
              <input value={form.apiPrefix} onChange={(e) => setForm((f) => ({ ...f, apiPrefix: e.target.value }))} className="input" placeholder="/api" /></div>
          </div>
          <div><label className="label">Access Token {source?.hasAccessToken && <span className="text-xs text-emerald-600">(token set)</span>}</label>
            <input type="password" value={form.accessToken} onChange={(e) => setForm((f) => ({ ...f, accessToken: e.target.value }))} className="input" placeholder="Leave blank to keep existing token" /></div>
          {source?.hasAccessToken && (
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <input type="checkbox" checked={clearToken} onChange={(e) => setClearToken(e.target.checked)} className="w-4 h-4 text-indigo-600 rounded" /> Clear stored access token
            </label>
          )}
          <label className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 cursor-pointer">
            <span className="text-sm font-medium text-slate-700">Source active</span>
            <input type="checkbox" checked={form.isActive} onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))} className="w-5 h-5 text-indigo-600 rounded" />
          </label>
          <label className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 cursor-pointer">
            <span className="text-sm font-medium text-slate-700">Scheduled sync enabled</span>
            <input type="checkbox" checked={form.syncScheduleEnabled} onChange={(e) => setForm((f) => ({ ...f, syncScheduleEnabled: e.target.checked }))} className="w-5 h-5 text-indigo-600 rounded" />
          </label>
          {form.syncScheduleEnabled && (
            <>
              <div><label className="label">Sync Interval (minutes)</label>
                <input type="number" min={5} max={1440} value={form.syncIntervalMinutes} onChange={(e) => setForm((f) => ({ ...f, syncIntervalMinutes: Number(e.target.value) }))} className="input" /></div>
              <div>
                <label className="label">Scheduled Sync Types</label>
                <div className="grid grid-cols-2 gap-2">
                  {SAMA_SYNC_TYPES.map((t) => (
                    <label key={t} className="flex items-center gap-2 text-sm text-slate-600">
                      <input type="checkbox" checked={form.scheduledSyncTypes.includes(t)} onChange={() => toggleSyncType(t)} className="w-4 h-4 text-indigo-600 rounded" />
                      {t.replace(/_/g, ' ')}
                    </label>
                  ))}
                </div>
              </div>
            </>
          )}
          {source?.lastSyncError && <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2 border border-red-100">Last error: {source.lastSyncError}</p>}
          <button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} className="btn-primary flex items-center gap-2 text-sm">
            <Save className="w-4 h-4" /> {saveMutation.isPending ? 'Saving...' : 'Save Source Config'}
          </button>
        </div>
      </div>

      <div className="card p-6">
        <h3 className="section-title mb-4">Manual Sync</h3>
        <div className="flex flex-wrap gap-2">
          {SYNC_ENDPOINTS.map(({ key, label, path }) => (
            <button key={key} onClick={() => syncMutation.mutate(path)} disabled={syncMutation.isPending} className="btn-secondary flex items-center gap-2 text-sm">
              <RefreshCw className="w-3.5 h-3.5" /> {label}
            </button>
          ))}
          <button onClick={() => runDueMutation.mutate()} disabled={runDueMutation.isPending} className="btn-primary flex items-center gap-2 text-sm">
            <RefreshCw className="w-3.5 h-3.5" /> Run Due Syncs
          </button>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="p-4 border-b border-slate-100"><h3 className="section-title">Recent Sync Runs</h3></div>
        {!syncRuns?.items?.length ? (
          <EmptyState icon={Cable} title="No sync runs yet" description="Trigger a manual sync above to see its history here." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr><th className="table-header text-left">Type</th><th className="table-header text-left">Mode</th><th className="table-header text-left">Result</th><th className="table-header text-left">Status</th><th className="table-header text-left">Started</th></tr></thead>
              <tbody>
                {syncRuns.items.map((run) => (
                  <tr key={run._id} className="table-row">
                    <td className="table-cell text-xs">{run.syncType}</td>
                    <td className="table-cell text-xs text-slate-500">{run.triggerMode}</td>
                    <td className="table-cell text-xs text-slate-500">{run.createdCount || 0} created / {run.updatedCount || 0} updated</td>
                    <td className="table-cell"><span className={cn('badge', run.status === 'SUCCESS' ? 'badge-green' : run.status === 'FAILED' ? 'badge-red' : 'badge-yellow')}>{run.status}</span></td>
                    <td className="table-cell text-xs text-slate-500">{formatDateTime(run.startedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
