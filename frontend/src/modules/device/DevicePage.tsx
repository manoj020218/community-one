import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Cpu, Wifi, WifiOff } from 'lucide-react';
import { api, extractData } from '../../services/api';
import { PageHeader } from '../../components/common/PageHeader';
import { EmptyState } from '../../components/common/EmptyState';
import { Modal } from '../../components/common/Modal';
import { VoiceInputField } from '../../components/common/VoiceInputField';
import { useAuthStore } from '../../store/authStore';
import { useSocietyStore } from '../../store/societyStore';
import { Device } from '../../types';
import { formatDateTime } from '../../utils/cn';
import toast from 'react-hot-toast';
import { cn } from '../../utils/cn';

const DEVICE_TYPES = ['BOOM_BARRIER_CONTROLLER','UHF_READER','QR_SCANNER','RFID_READER','ACCESS_READER','RELAY_CONTROLLER','GATE_CAMERA','GUARD_DEVICE','PANIC_BUTTON','IOT_GATEWAY','OTHER'];

export function DevicePage() {
  const { user } = useAuthStore();
  const { currentSociety } = useSocietyStore();
  const societyId = currentSociety?._id || user?.societyId || '';
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ societyId, deviceName: '', deviceType: 'UHF_READER', deviceCode: '', gateName: '', location: '', ipAddress: '' });

  const { data: devices = [], isLoading } = useQuery({
    queryKey: ['devices', societyId],
    queryFn: () => extractData<Device[]>(api.get(`/devices/society/${societyId}`)),
    enabled: !!societyId,
  });

  const mutation = useMutation({
    mutationFn: (d: any) => api.post('/devices', d),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['devices'] }); setShowModal(false); toast.success('Device registered!'); },
  });

  const set = (k: string) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <div className="space-y-6">
      <PageHeader title="Device Management" subtitle="Map and monitor IoT devices"
        action={<button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2"><Plus className="w-4 h-4" /> Add Device</button>} />

      {isLoading ? <div className="card p-8 text-center text-slate-400">Loading...</div> : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {devices.length === 0 ? (
            <div className="col-span-full">
              <EmptyState icon={Cpu} title="No devices mapped" description="Add IoT devices to monitor and control your society"
                action={<button onClick={() => setShowModal(true)} className="btn-primary">Add Device</button>} />
            </div>
          ) : (
            devices.map((device) => (
              <div key={device._id} className={cn('card p-5', device.onlineStatus ? 'border-emerald-200' : 'border-red-100')}>
                <div className="flex items-start justify-between mb-3">
                  <div className={cn('w-10 h-10 rounded-2xl flex items-center justify-center', device.onlineStatus ? 'bg-emerald-50' : 'bg-slate-100')}>
                    <Cpu className={cn('w-5 h-5', device.onlineStatus ? 'text-emerald-600' : 'text-slate-400')} />
                  </div>
                  <div className="flex items-center gap-1.5">
                    {device.onlineStatus ? <Wifi className="w-4 h-4 text-emerald-500" /> : <WifiOff className="w-4 h-4 text-slate-400" />}
                    <span className={cn('badge text-xs', device.onlineStatus ? 'badge-green' : 'badge-gray')}>
                      {device.onlineStatus ? 'Online' : 'Offline'}
                    </span>
                  </div>
                </div>
                <h3 className="font-semibold text-slate-800 text-sm mb-0.5">{device.deviceName}</h3>
                <p className="text-xs text-slate-500 mb-3">{device.deviceType.replace(/_/g, ' ')} · {device.deviceCode}</p>
                {device.gateName && <p className="text-xs text-slate-600"><span className="font-medium">Gate:</span> {device.gateName}</p>}
                {device.location && <p className="text-xs text-slate-600"><span className="font-medium">Location:</span> {device.location}</p>}
                {device.lastHeartbeatAt && <p className="text-xs text-slate-400 mt-2">Last seen: {formatDateTime(device.lastHeartbeatAt)}</p>}
                {device.firmwareVersion && <p className="text-xs text-slate-400">FW: {device.firmwareVersion}</p>}
              </div>
            ))
          )}
        </div>
      )}

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Add IoT Device">
        <div className="space-y-4">
          <VoiceInputField label="Device Name" value={form.deviceName} onChange={set('deviceName')} placeholder="Main Gate UHF Reader" required />
          <div><label className="label">Device Type</label>
            <select value={form.deviceType} onChange={(e) => set('deviceType')(e.target.value)} className="input">
              {DEVICE_TYPES.map((t) => <option key={t}>{t.replace(/_/g, ' ')}</option>)}</select></div>
          <VoiceInputField label="Device Code" value={form.deviceCode} onChange={set('deviceCode')} placeholder="DEV-001" required />
          <VoiceInputField label="Gate Name" value={form.gateName} onChange={set('gateName')} placeholder="Main Gate" />
          <VoiceInputField label="Location" value={form.location} onChange={set('location')} placeholder="Tower A Entrance" />
          <VoiceInputField label="IP Address" value={form.ipAddress} onChange={set('ipAddress')} placeholder="192.168.1.100" type="text" />
          <div className="flex gap-3 pt-2">
            <button onClick={() => mutation.mutate({ ...form, societyId })} disabled={mutation.isPending} className="btn-primary flex-1">{mutation.isPending ? 'Adding...' : 'Register Device'}</button>
            <button onClick={() => setShowModal(false)} className="btn-secondary">Cancel</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
