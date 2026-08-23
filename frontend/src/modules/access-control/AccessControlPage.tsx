import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, MapPin, KeyRound, ShieldCheck, History, RefreshCw, Unlink } from 'lucide-react';
import toast from 'react-hot-toast';
import { api, extractData } from '../../services/api';
import { PageHeader } from '../../components/common/PageHeader';
import { Modal } from '../../components/common/Modal';
import { EmptyState } from '../../components/common/EmptyState';
import { useAuthStore } from '../../store/authStore';
import { useSocietyStore } from '../../store/societyStore';
import { cn, formatDateTime } from '../../utils/cn';
import { Resident, Device } from '../../types';
import { AccessCredential, AccessEvent, AccessPolicy, Zone, ZoneDeviceBinding, ZONE_TYPES } from './access-control.types';

const BLANK_ZONE = { name: '', zoneType: 'GATE' as string, description: '' };
const BLANK_CREDENTIAL = { residentId: '', deviceId: '', deviceExternalUserId: '', label: '' };
const BLANK_POLICY = { name: '', residentId: '', zoneIds: [] as string[], accessMode: 'ALWAYS' as string };

export function AccessControlPage() {
  const { user } = useAuthStore();
  const { currentSociety } = useSocietyStore();
  const societyId = currentSociety?._id || user?.societyId || '';
  const queryClient = useQueryClient();

  const [showZoneModal, setShowZoneModal] = useState(false);
  const [zoneForm, setZoneForm] = useState(BLANK_ZONE);
  const [bindZone, setBindZone] = useState<Zone | null>(null);
  const [bindDeviceId, setBindDeviceId] = useState('');
  const [showCredentialModal, setShowCredentialModal] = useState(false);
  const [credentialForm, setCredentialForm] = useState(BLANK_CREDENTIAL);
  const [showPolicyModal, setShowPolicyModal] = useState(false);
  const [policyForm, setPolicyForm] = useState(BLANK_POLICY);
  const [eventFilter, setEventFilter] = useState('');
  const [resolveEventId, setResolveEventId] = useState<string | null>(null);
  const [resolveResidentId, setResolveResidentId] = useState('');

  const { data: zones } = useQuery({
    queryKey: ['access-zones', societyId],
    queryFn: () => extractData<Zone[]>(api.get(`/access/society/${societyId}/zones`)),
    enabled: !!societyId,
  });

  const { data: bindings } = useQuery({
    queryKey: ['access-zone-bindings', bindZone?._id],
    queryFn: () => extractData<ZoneDeviceBinding[]>(api.get(`/access/zones/${bindZone!._id}/bindings`)),
    enabled: !!bindZone,
  });

  const { data: credentials } = useQuery({
    queryKey: ['access-credentials', societyId],
    queryFn: () => extractData<AccessCredential[]>(api.get(`/access/society/${societyId}/credentials`)),
    enabled: !!societyId,
  });

  const { data: policies } = useQuery({
    queryKey: ['access-policies', societyId],
    queryFn: () => extractData<AccessPolicy[]>(api.get(`/access/society/${societyId}/policies`)),
    enabled: !!societyId,
  });

  const { data: events, isFetching: eventsSyncing } = useQuery({
    queryKey: ['access-events', societyId, eventFilter],
    queryFn: () => extractData<AccessEvent[]>(api.get(`/access/society/${societyId}/events`, { params: eventFilter ? { matchStatus: eventFilter } : {} })),
    enabled: !!societyId,
  });

  const { data: residents } = useQuery({
    queryKey: ['residents-society', societyId],
    queryFn: () => extractData<any>(api.get(`/residents/society/${societyId}?limit=500`)),
    enabled: !!societyId && (showCredentialModal || showPolicyModal || !!resolveEventId),
  });

  const { data: devices } = useQuery({
    queryKey: ['devices-society', societyId],
    queryFn: () => extractData<any>(api.get(`/devices/society/${societyId}`)),
    enabled: !!societyId && (showCredentialModal || !!bindZone),
  });

  const residentOptions: Resident[] = residents?.items || [];
  const deviceOptions: Device[] = devices?.items || [];

  const createZoneMutation = useMutation({
    mutationFn: () => api.post('/access/zones', { societyId, ...zoneForm }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['access-zones'] }); setShowZoneModal(false); setZoneForm(BLANK_ZONE); toast.success('Zone created!'); },
  });

  const bindDeviceMutation = useMutation({
    mutationFn: () => api.post(`/access/zones/${bindZone!._id}/bind-device`, { deviceId: bindDeviceId }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['access-zone-bindings', 'access-zones'] }); setBindDeviceId(''); toast.success('Device bound to zone!'); },
  });

  const unbindDeviceMutation = useMutation({
    mutationFn: (bindingId: string) => api.post(`/access/bindings/${bindingId}/unbind`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['access-zone-bindings', 'access-zones'] }); toast.success('Device unbound'); },
  });

  const createCredentialMutation = useMutation({
    mutationFn: () => api.post('/access/credentials', { societyId, ...credentialForm, label: credentialForm.label || undefined }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['access-credentials'] }); setShowCredentialModal(false); setCredentialForm(BLANK_CREDENTIAL); toast.success('Credential mapped!'); },
  });

  const revokeCredentialMutation = useMutation({
    mutationFn: (id: string) => api.post(`/access/credentials/${id}/revoke`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['access-credentials'] }); toast.success('Credential revoked'); },
  });

  const createPolicyMutation = useMutation({
    mutationFn: () => api.post('/access/policies', { societyId, ...policyForm }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['access-policies'] }); setShowPolicyModal(false); setPolicyForm(BLANK_POLICY); toast.success('Access policy created!'); },
  });

  const syncMutation = useMutation({
    mutationFn: () => api.post(`/access/society/${societyId}/sync`),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['access-events'] });
      const data = (res.data as any).data;
      toast.success(`Synced — ${data.newEvents} new event(s)`);
    },
  });

  const resolveEventMutation = useMutation({
    mutationFn: () => api.post(`/access/events/${resolveEventId}/resolve`, { residentId: resolveResidentId }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['access-events'] }); setResolveEventId(null); setResolveResidentId(''); toast.success('Event resolved'); },
  });

  const toggleZone = (zoneId: string) => (f: typeof policyForm) =>
    f.zoneIds.includes(zoneId) ? f.zoneIds.filter((z) => z !== zoneId) : [...f.zoneIds, zoneId];

  return (
    <div className="space-y-6">
      <PageHeader title="Member Access Control" subtitle="Zones, resident access policies and device-linked access history" />

      {/* Zones */}
      <div className="card overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="section-title flex items-center gap-2"><MapPin className="w-4 h-4 text-slate-400" /> Zones</h3>
          <button onClick={() => setShowZoneModal(true)} className="btn-primary flex items-center gap-2 text-sm"><Plus className="w-4 h-4" /> Add Zone</button>
        </div>
        {!zones?.length ? (
          <EmptyState icon={MapPin} title="No zones yet" description="Create a zone for your main gate, gym, pool or a hostel block." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr><th className="table-header text-left">Name</th><th className="table-header text-left">Type</th><th className="table-header text-left">Devices</th><th className="table-header text-left">Action</th></tr></thead>
              <tbody>
                {zones.map((z) => (
                  <tr key={z._id} className="table-row">
                    <td className="table-cell font-medium text-slate-800">{z.name}</td>
                    <td className="table-cell text-xs text-slate-500">{z.zoneType.replace(/_/g, ' ')}</td>
                    <td className="table-cell text-xs">{z.deviceCount} bound</td>
                    <td className="table-cell">
                      <button onClick={() => setBindZone(z)} className="text-primary-600 hover:text-primary-700 text-xs font-medium">Manage Devices</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Credentials */}
      <div className="card overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="section-title flex items-center gap-2"><KeyRound className="w-4 h-4 text-slate-400" /> Resident Device Mapping</h3>
          <button onClick={() => setShowCredentialModal(true)} className="btn-primary flex items-center gap-2 text-sm"><Plus className="w-4 h-4" /> Map Resident</button>
        </div>
        {!credentials?.length ? (
          <EmptyState icon={KeyRound} title="No mappings yet" description="Map a resident to the device-internal ID assigned when their face was enrolled on the terminal, so events resolve to a name." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr><th className="table-header text-left">Resident</th><th className="table-header text-left">Device</th><th className="table-header text-left">Device User ID</th><th className="table-header text-left">Status</th><th className="table-header text-left">Action</th></tr></thead>
              <tbody>
                {credentials.map((c) => (
                  <tr key={c._id} className="table-row">
                    <td className="table-cell text-sm">{typeof c.residentId === 'object' ? c.residentId.name : '—'}</td>
                    <td className="table-cell text-xs text-slate-500">{typeof c.deviceId === 'object' ? c.deviceId.deviceName : '—'}</td>
                    <td className="table-cell font-mono text-xs">{c.deviceExternalUserId}</td>
                    <td className="table-cell"><span className={cn('badge', c.status === 'ACTIVE' ? 'badge-green' : 'badge-gray')}>{c.status}</span></td>
                    <td className="table-cell">
                      {c.status === 'ACTIVE' && <button onClick={() => revokeCredentialMutation.mutate(c._id)} className="text-red-600 hover:text-red-700 text-xs font-medium">Revoke</button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Policies */}
      <div className="card overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="section-title flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-slate-400" /> Access Policies</h3>
          <button onClick={() => setShowPolicyModal(true)} className="btn-primary flex items-center gap-2 text-sm"><Plus className="w-4 h-4" /> Add Policy</button>
        </div>
        {!policies?.length ? (
          <EmptyState icon={ShieldCheck} title="No access policies yet" description="Record which zones a resident is permitted to use, for reporting and audit." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr><th className="table-header text-left">Name</th><th className="table-header text-left">Resident</th><th className="table-header text-left">Zones</th><th className="table-header text-left">Status</th></tr></thead>
              <tbody>
                {policies.map((p) => (
                  <tr key={p._id} className="table-row">
                    <td className="table-cell font-medium text-slate-800">{p.name}</td>
                    <td className="table-cell text-sm">{typeof p.residentId === 'object' ? p.residentId.name : '—'}</td>
                    <td className="table-cell text-xs text-slate-500">{p.zoneIds.map((z) => (typeof z === 'object' ? z.name : z)).join(', ')}</td>
                    <td className="table-cell"><span className={cn('badge', p.status === 'ACTIVE' ? 'badge-green' : 'badge-gray')}>{p.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Events */}
      <div className="card overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="section-title flex items-center gap-2"><History className="w-4 h-4 text-slate-400" /> Access Events</h3>
          <div className="flex items-center gap-2">
            <select value={eventFilter} onChange={(e) => setEventFilter(e.target.value)} className="input w-auto text-sm">
              <option value="">All</option>
              <option value="MATCHED">Matched</option>
              <option value="UNRESOLVED_CREDENTIAL">Unresolved</option>
            </select>
            <button onClick={() => syncMutation.mutate()} disabled={syncMutation.isPending} className="btn-secondary flex items-center gap-1.5 text-sm">
              <RefreshCw className={cn('w-3.5 h-3.5', (syncMutation.isPending || eventsSyncing) && 'animate-spin')} /> Sync Now
            </button>
          </div>
        </div>
        {!events?.length ? (
          <EmptyState icon={History} title="No access events" description="Events synced from bound devices will appear here." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr><th className="table-header text-left">Zone</th><th className="table-header text-left">Resident</th><th className="table-header text-left">Occurred</th><th className="table-header text-left">Status</th><th className="table-header text-left">Action</th></tr></thead>
              <tbody>
                {events.map((ev) => (
                  <tr key={ev._id} className="table-row">
                    <td className="table-cell text-sm">{typeof ev.zoneId === 'object' ? ev.zoneId.name : '—'}</td>
                    <td className="table-cell text-sm">{ev.residentId && typeof ev.residentId === 'object' ? ev.residentId.name : <span className="text-slate-400">Unresolved</span>}</td>
                    <td className="table-cell text-xs text-slate-500">{formatDateTime(ev.occurredAt)}</td>
                    <td className="table-cell"><span className={cn('badge', ev.matchStatus === 'MATCHED' ? 'badge-green' : 'badge-yellow')}>{ev.matchStatus.replace(/_/g, ' ')}</span></td>
                    <td className="table-cell">
                      {ev.matchStatus === 'UNRESOLVED_CREDENTIAL' && (
                        <button onClick={() => setResolveEventId(ev._id)} className="text-primary-600 hover:text-primary-700 text-xs font-medium">Resolve</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Zone Modal */}
      <Modal isOpen={showZoneModal} onClose={() => setShowZoneModal(false)} title="Add Zone">
        <div className="space-y-4">
          <div><label className="label">Name <span className="text-red-500">*</span></label>
            <input value={zoneForm.name} onChange={(e) => setZoneForm((f) => ({ ...f, name: e.target.value }))} className="input" placeholder="Main Gate / Gym / Pool" /></div>
          <div><label className="label">Type</label>
            <select value={zoneForm.zoneType} onChange={(e) => setZoneForm((f) => ({ ...f, zoneType: e.target.value }))} className="input">
              {ZONE_TYPES.map((t) => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
            </select></div>
          <div><label className="label">Description</label>
            <input value={zoneForm.description} onChange={(e) => setZoneForm((f) => ({ ...f, description: e.target.value }))} className="input" /></div>
          <div className="flex gap-3 pt-2">
            <button onClick={() => createZoneMutation.mutate()} disabled={createZoneMutation.isPending || !zoneForm.name} className="btn-primary flex-1">
              {createZoneMutation.isPending ? 'Creating...' : 'Create'}
            </button>
            <button onClick={() => setShowZoneModal(false)} className="btn-secondary">Cancel</button>
          </div>
        </div>
      </Modal>

      {/* Manage Zone Devices Modal */}
      <Modal isOpen={!!bindZone} onClose={() => setBindZone(null)} title={`Devices — ${bindZone?.name || ''}`}>
        <div className="space-y-4">
          {bindings && bindings.length > 0 && (
            <div className="space-y-2">
              {bindings.map((b) => (
                <div key={b._id} className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl text-sm">
                  <span>{typeof b.deviceId === 'object' ? b.deviceId.deviceName : b.deviceId}</span>
                  <button onClick={() => unbindDeviceMutation.mutate(b._id)} className="text-red-600 hover:text-red-700"><Unlink className="w-3.5 h-3.5" /></button>
                </div>
              ))}
            </div>
          )}
          <div>
            <label className="label">Bind Another Device</label>
            <select value={bindDeviceId} onChange={(e) => setBindDeviceId(e.target.value)} className="input">
              <option value="">Select device...</option>
              {deviceOptions.map((d) => <option key={d._id} value={d._id}>{d.deviceName}</option>)}
            </select>
          </div>
          <div className="flex gap-3 pt-1">
            <button onClick={() => bindDeviceMutation.mutate()} disabled={bindDeviceMutation.isPending || !bindDeviceId} className="btn-primary flex-1">
              {bindDeviceMutation.isPending ? 'Binding...' : 'Bind Device'}
            </button>
            <button onClick={() => setBindZone(null)} className="btn-secondary">Close</button>
          </div>
        </div>
      </Modal>

      {/* Map Resident Modal */}
      <Modal isOpen={showCredentialModal} onClose={() => setShowCredentialModal(false)} title="Map Resident to Device">
        <div className="space-y-4">
          <div><label className="label">Resident <span className="text-red-500">*</span></label>
            <select value={credentialForm.residentId} onChange={(e) => setCredentialForm((f) => ({ ...f, residentId: e.target.value }))} className="input">
              <option value="">Select resident...</option>
              {residentOptions.map((r) => <option key={r._id} value={r._id}>{r.name} ({r.mobile})</option>)}
            </select></div>
          <div><label className="label">Device <span className="text-red-500">*</span></label>
            <select value={credentialForm.deviceId} onChange={(e) => setCredentialForm((f) => ({ ...f, deviceId: e.target.value }))} className="input">
              <option value="">Select device...</option>
              {deviceOptions.map((d) => <option key={d._id} value={d._id}>{d.deviceName}</option>)}
            </select></div>
          <div><label className="label">Device User ID <span className="text-red-500">*</span></label>
            <input value={credentialForm.deviceExternalUserId} onChange={(e) => setCredentialForm((f) => ({ ...f, deviceExternalUserId: e.target.value }))} className="input" placeholder="ID shown when the face was enrolled on the device" /></div>
          <div><label className="label">Label</label>
            <input value={credentialForm.label} onChange={(e) => setCredentialForm((f) => ({ ...f, label: e.target.value }))} className="input" /></div>
          <div className="flex gap-3 pt-2">
            <button onClick={() => createCredentialMutation.mutate()} disabled={createCredentialMutation.isPending || !credentialForm.residentId || !credentialForm.deviceId || !credentialForm.deviceExternalUserId} className="btn-primary flex-1">
              {createCredentialMutation.isPending ? 'Saving...' : 'Save Mapping'}
            </button>
            <button onClick={() => setShowCredentialModal(false)} className="btn-secondary">Cancel</button>
          </div>
        </div>
      </Modal>

      {/* Add Policy Modal */}
      <Modal isOpen={showPolicyModal} onClose={() => setShowPolicyModal(false)} title="Add Access Policy">
        <div className="space-y-4">
          <div><label className="label">Name <span className="text-red-500">*</span></label>
            <input value={policyForm.name} onChange={(e) => setPolicyForm((f) => ({ ...f, name: e.target.value }))} className="input" /></div>
          <div><label className="label">Resident <span className="text-red-500">*</span></label>
            <select value={policyForm.residentId} onChange={(e) => setPolicyForm((f) => ({ ...f, residentId: e.target.value }))} className="input">
              <option value="">Select resident...</option>
              {residentOptions.map((r) => <option key={r._id} value={r._id}>{r.name} ({r.mobile})</option>)}
            </select></div>
          <div>
            <label className="label">Zones <span className="text-red-500">*</span></label>
            <div className="flex flex-wrap gap-2">
              {(zones || []).map((z) => (
                <button key={z._id} type="button" onClick={() => setPolicyForm((f) => ({ ...f, zoneIds: toggleZone(z._id)(f) }))}
                  className={cn('px-3 py-1.5 rounded-lg text-xs font-medium border', policyForm.zoneIds.includes(z._id) ? 'bg-primary-50 border-primary-300 text-primary-700' : 'border-slate-200 text-slate-600')}>
                  {z.name}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={() => createPolicyMutation.mutate()} disabled={createPolicyMutation.isPending || !policyForm.name || !policyForm.residentId || policyForm.zoneIds.length === 0} className="btn-primary flex-1">
              {createPolicyMutation.isPending ? 'Creating...' : 'Create'}
            </button>
            <button onClick={() => setShowPolicyModal(false)} className="btn-secondary">Cancel</button>
          </div>
        </div>
      </Modal>

      {/* Resolve Event Modal */}
      <Modal isOpen={!!resolveEventId} onClose={() => setResolveEventId(null)} title="Resolve Access Event">
        <div className="space-y-4">
          <div><label className="label">Resident <span className="text-red-500">*</span></label>
            <select value={resolveResidentId} onChange={(e) => setResolveResidentId(e.target.value)} className="input">
              <option value="">Select resident...</option>
              {residentOptions.map((r) => <option key={r._id} value={r._id}>{r.name} ({r.mobile})</option>)}
            </select></div>
          <div className="flex gap-3 pt-2">
            <button onClick={() => resolveEventMutation.mutate()} disabled={resolveEventMutation.isPending || !resolveResidentId} className="btn-primary flex-1">
              {resolveEventMutation.isPending ? 'Saving...' : 'Resolve'}
            </button>
            <button onClick={() => setResolveEventId(null)} className="btn-secondary">Cancel</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
