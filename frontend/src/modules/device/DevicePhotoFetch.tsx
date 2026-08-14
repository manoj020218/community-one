import { useState, useEffect } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Camera, Loader2 } from 'lucide-react';
import { api, extractData } from '../../services/api';
import toast from 'react-hot-toast';

interface DevicePhotoFetchProps {
  deviceId: string;
  deviceExternalUserId: string;
  checkinTimeUtc: string;
}

interface PhotoRequestStatus {
  status: 'PENDING' | 'READY' | 'NOT_FOUND';
  photoBase64?: string;
}

/**
 * On-demand only — no photo is ever fetched unless an admin explicitly asks for this specific
 * record, and nothing is cached beyond this component's own state. The device/gateway may take
 * up to a full poll cycle (~15-30s) to respond, since the request rides the same poll channel as
 * regular attendance sync — see U5_DEVICE_INTEGRATION_HANDOFF.md.
 */
export function DevicePhotoFetch({ deviceId, deviceExternalUserId, checkinTimeUtc }: DevicePhotoFetchProps) {
  const [requestId, setRequestId] = useState<string | null>(null);
  const [photoBase64, setPhotoBase64] = useState<string | null>(null);

  const createRequest = useMutation({
    mutationFn: () => extractData<{ requestId: string }>(
      api.post(`/devices/${deviceId}/photo-requests`, { deviceExternalUserId, checkinTime: checkinTimeUtc })
    ),
    onSuccess: (data) => setRequestId(data.requestId),
  });

  const { data: status } = useQuery({
    queryKey: ['photo-request', requestId],
    queryFn: () => extractData<PhotoRequestStatus>(api.get(`/devices/photo-requests/${requestId}`)),
    enabled: !!requestId,
    refetchInterval: 2000,
  });

  useEffect(() => {
    if (!requestId || !status) return;
    if (status.status === 'READY' && status.photoBase64) {
      setPhotoBase64(status.photoBase64);
      setRequestId(null);
    } else if (status.status === 'NOT_FOUND') {
      toast.error('No response from the device/gateway in time — it may be offline');
      setRequestId(null);
    }
  }, [status, requestId]);

  if (photoBase64) {
    return <img src={`data:image/jpeg;base64,${photoBase64}`} alt="Device snapshot" className="mt-2 rounded-lg max-h-32" />;
  }

  if (requestId) {
    return (
      <span className="mt-2 inline-flex items-center gap-1.5 text-xs text-slate-500">
        <Loader2 className="w-3 h-3 animate-spin" /> Waiting for device (up to ~30s)...
      </span>
    );
  }

  return (
    <button
      onClick={() => createRequest.mutate()}
      disabled={createRequest.isPending}
      className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-primary-600 hover:underline"
    >
      <Camera className="w-3 h-3" /> Fetch photo from device
    </button>
  );
}
