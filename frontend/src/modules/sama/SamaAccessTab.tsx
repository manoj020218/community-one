import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, ShieldCheck, KeyRound, Cpu } from 'lucide-react';
import toast from 'react-hot-toast';
import { api, extractData } from '../../services/api';
import { Modal } from '../../components/common/Modal';
import { EmptyState } from '../../components/common/EmptyState';
import { TableSkeleton } from '../../components/common/LoadingSkeleton';
import { useAuthStore } from '../../store/authStore';
import { useSocietyStore } from '../../store/societyStore';
import { cn } from '../../utils/cn';
import {
  AccessCredential, AccessPolicy, PaginatedResult, SAMA_ACCESS_MODES, SAMA_ACCESS_POLICY_SUBJECT_TYPES,
  SAMA_CREDENTIAL_TYPES, SamaDeviceBinding, SamaExternalDevice, ServiceProviderProfile, StaffProfile,
} from './sama.types';

const BLANK_POLICY = { name: '', subjectType: 'STAFF_PROFILE' as string, subjectId: '', accessMode: 'ALWAYS' as string };
const BLANK_CREDENTIAL = { subjectType: 'STAFF_PROFILE' as string, subjectId: '', credentialType: 'PIN' as string, credentialValue: '', credentialLabel: '' };

export function SamaAccessTab() {
  const { user } = useAuthStore();
  const { currentSociety } = useSocietyStore();
  const societyId = currentSociety?._id || user?.societyId || '';
  const queryClient = useQueryClient();

  const [showPolicyModal, setShowPolicyModal] = useState(false);
  const [policyForm, setPolicyForm] = useState(BLANK_POLICY);
  const [showCredentialModal, setShowCredentialModal] = useState(false);
  const [credentialForm, setCredentialForm] = useState(BLANK_CREDENTIAL);
  const [bindDeviceId, setBindDeviceId] = useState<string | null>(null);
  const [jenixDeviceId, setJenixDeviceId] = useState('');

  const { data: policies } = useQuery({
    queryKey: ['sama-policies', societyId],
    queryFn: () => extractData<PaginatedResult<AccessPolicy>>(api.get('/sama/access-policies', { params: { societyId, limit: 100 } })),
    enabled: !!societyId,
  });

  const { data: credentials } = useQuery({
    queryKey: ['sama-credentials', societyId],
    queryFn: () => extractData<PaginatedResult<AccessCredential>>(api.get('/sama/credentials', { params: { societyId, limit: 100 } })),
    enabled: !!societyId,
  });

  const { data: bindings } = useQuery({
    queryKey: ['sama-device-bindings', societyId],
    queryFn: () => extractData<PaginatedResult<SamaDeviceBinding>>(api.get('/sama/device-bindings', { params: { societyId, limit: 100 } })),
    enabled: !!societyId,
  });

  const { data: externalDevices } = useQuery({
    queryKey: ['sama-external-devices', societyId],
    queryFn: () => extractData<SamaExternalDevice[]>(api.get('/sama/external-devices', { params: { societyId } })),
    enabled: !!societyId,
    retry: false,
  });

  const { data: staff } = useQuery({
    queryKey: ['sama-staff', societyId],
    queryFn: () => extractData<PaginatedResult<StaffProfile>>(api.get('/sama/staff-profiles', { params: { societyId, limit: 200 } })),
    enabled: !!societyId && (showPolicyModal || showCredentialModal),
  });

  const { data: providers } = useQuery({
    queryKey: ['sama-providers', societyId],
    queryFn: () => extractData<PaginatedResult<ServiceProviderProfile>>(api.get('/sama/service-providers', { params: { societyId, limit: 200 } })),
    enabled: !!societyId && (showPolicyModal || showCredentialModal),
  });

  const { data: devices } = useQuery({
    queryKey: ['devices-list', societyId],
    queryFn: () => extractData<any>(api.get(`/devices/society/${societyId}`)),
    enabled: !!societyId && !!bindDeviceId,
  });

  const subjectOptions = (subjectType: string) =>
    subjectType === 'STAFF_PROFILE' ? staff?.items?.map((s) => ({ id: s._id, label: s.displayName })) || []
    : subjectType === 'SERVICE_PROVIDER' ? providers?.items?.map((p) => ({ id: p._id, label: p.displayName })) || []
    : [];

  const createPolicyMutation = useMutation({
    mutationFn: () => api.post('/sama/access-policies', { societyId, ...policyForm }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['sama-policies'] }); setShowPolicyModal(false); setPolicyForm(BLANK_POLICY); toast.success('Access policy created!'); },
  });

  const createCredentialMutation = useMutation({
    mutationFn: () => api.post('/sama/credentials', { societyId, ...credentialForm, credentialLabel: credentialForm.credentialLabel || undefined }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['sama-credentials'] }); setShowCredentialModal(false); setCredentialForm(BLANK_CREDENTIAL); toast.success('Credential issued!'); },
  });

  const revokeCredentialMutation = useMutation({
    mutationFn: (credentialId: string) => api.patch(`/sama/credentials/${credentialId}/revoke`, { societyId }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['sama-credentials'] }); toast.success('Credential revoked'); },
  });

  const bindMutation = useMutation({
    mutationFn: () => {
      const device = externalDevices?.find((d) => d.externalDeviceId === bindDeviceId);
      return api.post('/sama/device-bindings', { societyId, externalDeviceType: device?.externalDeviceType, externalDeviceId: bindDeviceId, externalDeviceName: device?.externalDeviceName, jenixDeviceId });
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['sama-device-bindings', 'sama-external-devices'] }); setBindDeviceId(null); setJenixDeviceId(''); toast.success('Device bound!'); },
  });

  return (
    <div className="space-y-6">
      <div className="card overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="section-title flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-slate-400" /> Access Policies</h3>
          <button onClick={() => setShowPolicyModal(true)} className="btn-primary flex items-center gap-2 text-sm"><Plus className="w-4 h-4" /> Add Policy</button>
        </div>
        {!policies?.items?.length ? (
          <EmptyState icon={ShieldCheck} title="No access policies yet" description="Define who can access which gates and when." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr><th className="table-header text-left">Name</th><th className="table-header text-left">Subject</th><th className="table-header text-left">Mode</th><th className="table-header text-left">Status</th></tr></thead>
              <tbody>
                {policies.items.map((p) => (
                  <tr key={p._id} className="table-row">
                    <td className="table-cell font-medium text-slate-800">{p.name}</td>
                    <td className="table-cell text-xs text-slate-500">{p.subjectType.replace(/_/g, ' ')}</td>
                    <td className="table-cell text-xs text-slate-500">{p.accessMode.replace(/_/g, ' ')}</td>
                    <td className="table-cell"><span className={cn('badge', p.status === 'ACTIVE' ? 'badge-green' : 'badge-gray')}>{p.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="card overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="section-title flex items-center gap-2"><KeyRound className="w-4 h-4 text-slate-400" /> Access Credentials</h3>
          <button onClick={() => setShowCredentialModal(true)} className="btn-primary flex items-center gap-2 text-sm"><Plus className="w-4 h-4" /> Issue Credential</button>
        </div>
        {!credentials?.items?.length ? (
          <EmptyState icon={KeyRound} title="No credentials issued yet" description="Issue a PIN, QR, RFID or mobile-token credential for gate access." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr><th className="table-header text-left">Type</th><th className="table-header text-left">Label</th><th className="table-header text-left">Last 4</th><th className="table-header text-left">Status</th><th className="table-header text-left">Action</th></tr></thead>
              <tbody>
                {credentials.items.map((c) => (
                  <tr key={c._id} className="table-row">
                    <td className="table-cell text-xs">{c.credentialType}</td>
                    <td className="table-cell text-sm">{c.credentialLabel || '—'}</td>
                    <td className="table-cell font-mono text-xs">•••• {c.identifierLast4}</td>
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

      <div className="card overflow-hidden">
        <div className="p-4 border-b border-slate-100"><h3 className="section-title flex items-center gap-2"><Cpu className="w-4 h-4 text-slate-400" /> Device Bindings</h3></div>
        {!externalDevices?.length ? (
          <EmptyState icon={Cpu} title="No external devices found" description="Configure the EdgeFolio bridge in the Bridge & Sync tab to discover M68/U5 devices." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr><th className="table-header text-left">Device</th><th className="table-header text-left">Type</th><th className="table-header text-left">Bound To</th><th className="table-header text-left">Action</th></tr></thead>
              <tbody>
                {externalDevices.map((d) => (
                  <tr key={d.externalDeviceId} className="table-row">
                    <td className="table-cell text-sm">{d.externalDeviceName}</td>
                    <td className="table-cell text-xs text-slate-500">{d.externalDeviceType}</td>
                    <td className="table-cell text-xs">{d.isBound ? <span className="badge badge-green">Bound</span> : <span className="badge badge-gray">Unbound</span>}</td>
                    <td className="table-cell">
                      {!d.isBound && <button onClick={() => setBindDeviceId(d.externalDeviceId)} className="text-primary-600 hover:text-primary-700 text-xs font-medium">Bind</button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal isOpen={showPolicyModal} onClose={() => setShowPolicyModal(false)} title="Add Access Policy">
        <div className="space-y-4">
          <div><label className="label">Name <span className="text-red-500">*</span></label>
            <input value={policyForm.name} onChange={(e) => setPolicyForm((f) => ({ ...f, name: e.target.value }))} className="input" /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="label">Subject Type</label>
              <select value={policyForm.subjectType} onChange={(e) => setPolicyForm((f) => ({ ...f, subjectType: e.target.value, subjectId: '' }))} className="input">
                {SAMA_ACCESS_POLICY_SUBJECT_TYPES.filter((t) => t !== 'WORK_ORDER').map((t) => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
              </select></div>
            <div><label className="label">Subject <span className="text-red-500">*</span></label>
              <select value={policyForm.subjectId} onChange={(e) => setPolicyForm((f) => ({ ...f, subjectId: e.target.value }))} className="input">
                <option value="">Select...</option>
                {subjectOptions(policyForm.subjectType).map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
              </select></div>
          </div>
          <div><label className="label">Access Mode</label>
            <select value={policyForm.accessMode} onChange={(e) => setPolicyForm((f) => ({ ...f, accessMode: e.target.value }))} className="input">
              {SAMA_ACCESS_MODES.map((m) => <option key={m}>{m.replace(/_/g, ' ')}</option>)}
            </select></div>
          <div className="flex gap-3 pt-2">
            <button onClick={() => createPolicyMutation.mutate()} disabled={createPolicyMutation.isPending || !policyForm.name || !policyForm.subjectId} className="btn-primary flex-1">
              {createPolicyMutation.isPending ? 'Creating...' : 'Create'}
            </button>
            <button onClick={() => setShowPolicyModal(false)} className="btn-secondary">Cancel</button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={showCredentialModal} onClose={() => setShowCredentialModal(false)} title="Issue Access Credential">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div><label className="label">Subject Type</label>
              <select value={credentialForm.subjectType} onChange={(e) => setCredentialForm((f) => ({ ...f, subjectType: e.target.value, subjectId: '' }))} className="input">
                {SAMA_ACCESS_POLICY_SUBJECT_TYPES.filter((t) => t !== 'WORK_ORDER').map((t) => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
              </select></div>
            <div><label className="label">Subject <span className="text-red-500">*</span></label>
              <select value={credentialForm.subjectId} onChange={(e) => setCredentialForm((f) => ({ ...f, subjectId: e.target.value }))} className="input">
                <option value="">Select...</option>
                {subjectOptions(credentialForm.subjectType).map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
              </select></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="label">Credential Type</label>
              <select value={credentialForm.credentialType} onChange={(e) => setCredentialForm((f) => ({ ...f, credentialType: e.target.value }))} className="input">
                {SAMA_CREDENTIAL_TYPES.map((t) => <option key={t}>{t.replace(/_/g, ' ')}</option>)}
              </select></div>
            <div><label className="label">Label</label>
              <input value={credentialForm.credentialLabel} onChange={(e) => setCredentialForm((f) => ({ ...f, credentialLabel: e.target.value }))} className="input" /></div>
          </div>
          <div><label className="label">Credential Value <span className="text-red-500">*</span></label>
            <input type="password" value={credentialForm.credentialValue} onChange={(e) => setCredentialForm((f) => ({ ...f, credentialValue: e.target.value }))} className="input" placeholder="Only the last 4 characters are stored for display" /></div>
          <div className="flex gap-3 pt-2">
            <button onClick={() => createCredentialMutation.mutate()} disabled={createCredentialMutation.isPending || !credentialForm.subjectId || !credentialForm.credentialValue} className="btn-primary flex-1">
              {createCredentialMutation.isPending ? 'Issuing...' : 'Issue'}
            </button>
            <button onClick={() => setShowCredentialModal(false)} className="btn-secondary">Cancel</button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={!!bindDeviceId} onClose={() => setBindDeviceId(null)} title="Bind Device">
        <div className="space-y-4">
          <div><label className="label">Jenix Device <span className="text-red-500">*</span></label>
            <select value={jenixDeviceId} onChange={(e) => setJenixDeviceId(e.target.value)} className="input">
              <option value="">Select device...</option>
              {devices?.items?.map((d: any) => <option key={d._id} value={d._id}>{d.name || d._id}</option>)}
            </select></div>
          <div className="flex gap-3 pt-2">
            <button onClick={() => bindMutation.mutate()} disabled={bindMutation.isPending || !jenixDeviceId} className="btn-primary flex-1">
              {bindMutation.isPending ? 'Binding...' : 'Bind'}
            </button>
            <button onClick={() => setBindDeviceId(null)} className="btn-secondary">Cancel</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
