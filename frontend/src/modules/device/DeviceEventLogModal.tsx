import { useQuery } from '@tanstack/react-query';
import { Copy, RefreshCw, AlertTriangle } from 'lucide-react';
import { api, extractData } from '../../services/api';
import { Modal } from '../../components/common/Modal';
import { Device, DeviceEventLog } from '../../types';
import { formatDateTime } from '../../utils/cn';
import toast from 'react-hot-toast';

interface DeviceEventLogModalProps {
  device: Device | null;
  onClose: () => void;
}

export function DeviceEventLogModal({ device, onClose }: DeviceEventLogModalProps) {
  const pushUrl = device ? `${window.location.origin}/api/devices/push/${device.apiKey}` : '';

  const { data: logs = [], isFetching, refetch } = useQuery({
    queryKey: ['device-event-logs', device?._id],
    queryFn: () => extractData<DeviceEventLog[]>(api.get(`/devices/${device!._id}/event-logs?limit=20`)),
    enabled: !!device,
    refetchInterval: device ? 5000 : false, // poll while the modal is open so live pushes show up during hardware testing
  });

  const copyPushUrl = () => {
    navigator.clipboard.writeText(pushUrl);
    toast.success('Push URL copied — paste it into the device\'s third-party push settings');
  };

  if (!device) return null;

  return (
    <Modal isOpen={!!device} onClose={onClose} title={`${device.deviceName} — Push & Event Log`} size="lg">
      <div className="space-y-4">
        <div className="p-3 bg-slate-50 rounded-xl space-y-2">
          <p className="text-xs text-slate-500">Configure this exact URL as the device's "third-party record push" target (no custom headers needed — the key is in the path):</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-xs bg-white border border-slate-200 rounded-lg px-2 py-1.5 overflow-x-auto whitespace-nowrap">{pushUrl}</code>
            <button onClick={copyPushUrl} className="btn-secondary p-2" title="Copy"><Copy className="w-4 h-4" /></button>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-slate-700">Recent pushes ({logs.length})</p>
          <button onClick={() => refetch()} className="text-xs text-slate-500 hover:text-slate-700 flex items-center gap-1">
            <RefreshCw className={`w-3 h-3 ${isFetching ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>

        {logs.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-8">No pushes received yet — trigger the device and this will update automatically every few seconds.</p>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {logs.map((log) => (
              <div key={log._id} className="p-3 border border-slate-100 rounded-xl">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-slate-400">{formatDateTime(log.receivedAt)}</span>
                  {log.warning && <span className="text-xs text-amber-600 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> {log.warning}</span>}
                </div>
                {log.parsedEvents.length > 0 ? (
                  log.parsedEvents.map((e, i) => (
                    <p key={i} className="text-sm text-slate-700">
                      <strong>{e.personName || e.deviceExternalUserId}</strong> · {e.method} · {e.passed ? 'Passed' : 'Denied'} · {formatDateTime(e.timestamp)}
                    </p>
                  ))
                ) : (
                  <p className="text-xs text-slate-400">Raw body received, nothing parsed — check the adapter's field-name variants against the JSON below.</p>
                )}
                <pre className="mt-2 text-[10px] bg-slate-50 rounded-lg p-2 overflow-x-auto text-slate-500">{JSON.stringify(log.rawBody, null, 2)}</pre>
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
}
