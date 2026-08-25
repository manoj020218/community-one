import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import jsQR from 'jsqr';
import { LogOut, ShieldCheck, Camera, X, MapPin, CheckCircle2, Clock, Footprints } from 'lucide-react';
import toast from 'react-hot-toast';
import { api, extractData } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { useSocietyStore } from '../../store/societyStore';
import { PatrolAssignment, PatrolRound, RoundProgress } from './guardPatrol.types';
import { playAlertSound, vibrateAlert } from './alertSounds';

function timeSince(iso: string): string {
  const secs = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  const m = Math.floor(secs / 60), s = secs % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function GuardPatrolKioskPage() {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const { currentSociety } = useSocietyStore();
  const societyId = currentSociety?._id || user?.societyId || '';
  const queryClient = useQueryClient();

  const [selectedRouteId, setSelectedRouteId] = useState('');
  const [scanning, setScanning] = useState(false);
  const [alerting, setAlerting] = useState(false);
  const [now, setNow] = useState(Date.now());
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanLoopRef = useRef<number | null>(null);
  const alertIntervalRef = useRef<number | null>(null);

  const { data: assignments } = useQuery({
    queryKey: ['patrol-my-assignments', societyId],
    queryFn: () => extractData<PatrolAssignment[]>(api.get('/guard-patrol/assignments/me', { params: { societyId } })),
    enabled: !!societyId,
  });

  const { data: activeRound, refetch: refetchActiveRound } = useQuery({
    queryKey: ['patrol-my-active-round', societyId],
    queryFn: () => extractData<PatrolRound | null>(api.get('/guard-patrol/rounds/mine/active', { params: { societyId } })),
    enabled: !!societyId,
  });

  const { data: progress, refetch: refetchProgress } = useQuery({
    queryKey: ['patrol-round-progress', activeRound?._id],
    queryFn: () => extractData<RoundProgress>(api.get(`/guard-patrol/rounds/${activeRound!._id}`, { params: { societyId } })),
    enabled: !!activeRound?._id,
  });

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  // Alert timer — checks elapsed time since the last scan (or round start) against the
  // threshold every 5s; vibrates + sounds on breach, repeating until the next scan clears it.
  useEffect(() => {
    if (alertIntervalRef.current) clearInterval(alertIntervalRef.current);
    if (!progress || progress.round.status !== 'IN_PROGRESS') { setAlerting(false); return; }
    const check = () => {
      const lastScan = progress.scans[progress.scans.length - 1];
      const referenceTime = lastScan ? new Date(lastScan.scannedAt) : new Date(progress.round.startedAt);
      const elapsedMin = (Date.now() - referenceTime.getTime()) / 60000;
      const breached = elapsedMin > progress.alertThresholdMinutes;
      setAlerting(breached);
      if (breached) {
        vibrateAlert();
        playAlertSound('chime');
      }
    };
    check();
    alertIntervalRef.current = window.setInterval(check, 15000);
    return () => { if (alertIntervalRef.current) clearInterval(alertIntervalRef.current); };
  }, [progress]);

  const startMutation = useMutation({
    mutationFn: () => api.post('/guard-patrol/rounds', { routeId: selectedRouteId }, { params: { societyId } }),
    onSuccess: async () => { toast.success('Round started'); await refetchActiveRound(); },
    onError: (err: any) => toast.error(err?.response?.data?.error?.message || 'Failed to start round'),
  });

  const endMutation = useMutation({
    mutationFn: () => api.post(`/guard-patrol/rounds/${activeRound!._id}/end`, {}, { params: { societyId } }),
    onSuccess: async () => { toast.success('Round ended'); await refetchActiveRound(); queryClient.removeQueries({ queryKey: ['patrol-round-progress'] }); },
  });

  const getGpsFix = (): Promise<GeolocationPosition> => new Promise((resolve, reject) => {
    if (!navigator.geolocation) { reject(new Error('GPS is not available on this device')); return; }
    navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 });
  });

  const scanMutation = useMutation({
    mutationFn: async (token: string) => {
      const pos = await getGpsFix();
      return api.post(`/guard-patrol/rounds/${activeRound!._id}/scan`, {
        token, lat: pos.coords.latitude, lng: pos.coords.longitude, gpsAccuracyM: pos.coords.accuracy, method: 'QR',
      }, { params: { societyId } });
    },
    onSuccess: async (res: any) => {
      toast.success(res?.data?.data?.status === 'LATE' ? 'Checkpoint scanned — was late' : 'Checkpoint scanned');
      stopCamera();
      await refetchActiveRound();
      await refetchProgress();
    },
    onError: (err: any) => {
      const message = err?.message === 'GPS is not available on this device'
        ? 'Could not get your GPS location — move outdoors and try again'
        : err?.response?.data?.error?.message || 'Could not confirm GPS location — move outdoors and try again';
      toast.error(message);
      // keep the camera open so the guard can retry immediately
      scanLoopRef.current = requestAnimationFrame(scanLoop);
    },
  });

  const scanLoop = () => {
    const video = videoRef.current, canvas = canvasRef.current;
    if (video && canvas && video.readyState === video.HAVE_ENOUGH_DATA) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height);
        if (code?.data && !scanMutation.isPending) {
          const match = code.data.match(/\/patrol-scan\/([a-zA-Z0-9]+)/);
          scanMutation.mutate(match ? match[1] : code.data);
          return;
        }
      }
    }
    scanLoopRef.current = requestAnimationFrame(scanLoop);
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setScanning(true);
      scanLoopRef.current = requestAnimationFrame(scanLoop);
    } catch {
      toast.error('Camera access denied — allow camera permission and try again');
    }
  };

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (scanLoopRef.current) cancelAnimationFrame(scanLoopRef.current);
    scanLoopRef.current = null;
    setScanning(false);
  };

  useEffect(() => () => stopCamera(), []);

  if (!user) return null;

  const routeOptions = (assignments || []).map((a) => a.routeId).filter((r): r is { _id: string; name: string } => typeof r === 'object');

  return (
    <div className={`fixed inset-0 overflow-hidden safe-area-top safe-area-bottom transition-colors ${alerting ? 'bg-gradient-to-br from-rose-950 via-rose-900 to-slate-900' : 'bg-gradient-to-br from-slate-900 via-cyan-950 to-slate-900'}`}>
      <div className="flex items-center justify-between px-4 py-3 shrink-0">
        <div className="flex items-center gap-2 text-white font-bold">
          <Footprints className="w-5 h-5" />
          <span className="text-sm">{user.name}</span>
        </div>
        <button onClick={() => { logout(); navigate('/login'); }} className="p-2 rounded-xl bg-white/10 text-white/80 hover:bg-white/20">
          <LogOut className="w-4 h-4" />
        </button>
      </div>

      <div className="flex flex-col items-center justify-center h-[calc(100%-56px)] px-6 gap-6">
        {!activeRound ? (
          <div className="w-full max-w-sm space-y-4">
            <div className="text-center text-white/70 text-sm mb-2">Start your patrol round</div>
            {!routeOptions.length ? (
              <div className="text-center text-white/60 text-sm bg-white/10 rounded-2xl p-6">No route assigned to you yet — ask your admin to assign one.</div>
            ) : (
              <>
                <select value={selectedRouteId} onChange={(e) => setSelectedRouteId(e.target.value)} className="w-full px-4 py-3 rounded-2xl bg-white/10 border border-white/20 text-white">
                  <option value="" className="text-slate-900">Select a route...</option>
                  {routeOptions.map((r) => <option key={r._id} value={r._id} className="text-slate-900">{r.name}</option>)}
                </select>
                <button onClick={() => startMutation.mutate()} disabled={!selectedRouteId || startMutation.isPending} className="w-full py-4 rounded-2xl bg-white text-slate-900 font-bold text-lg disabled:opacity-50">
                  {startMutation.isPending ? 'Starting...' : 'Start Round'}
                </button>
              </>
            )}
          </div>
        ) : scanning ? (
          <div className="w-full h-full flex flex-col items-center justify-center gap-4">
            <div className="relative w-full max-w-sm aspect-square rounded-3xl overflow-hidden border-4 border-white/40">
              <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
              <canvas ref={canvasRef} className="hidden" />
              <div className="absolute inset-6 border-2 border-dashed border-white/60 rounded-2xl pointer-events-none" />
            </div>
            <p className="text-white/80 text-sm">{scanMutation.isPending ? 'Confirming location…' : 'Point the camera at the checkpoint QR code'}</p>
            <button onClick={stopCamera} className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-white/10 text-white border border-white/20"><X className="w-4 h-4" /> Cancel</button>
          </div>
        ) : (
          <div className="w-full max-w-sm space-y-5 text-center">
            {alerting && (
              <div className="rounded-2xl bg-white/15 border border-white/30 px-4 py-3 text-white font-semibold animate-pulse">
                ⚠ Overdue for next checkpoint
              </div>
            )}
            <div>
              <p className="text-white/60 text-xs uppercase tracking-wide mb-1">Round in progress</p>
              <p className="text-white text-3xl font-bold tabular-nums flex items-center justify-center gap-2">
                <Clock className="w-6 h-6" /> {timeSince(progress?.scans[progress.scans.length - 1]?.scannedAt || activeRound.startedAt)}
              </p>
              <p className="text-white/50 text-xs mt-1">since last checkpoint</p>
            </div>
            <div className="flex items-center justify-center gap-4 text-white/80 text-sm">
              <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-emerald-400" /> {progress?.scans.length || 0} scanned</span>
              <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4 text-cyan-400" /> {progress?.remainingCheckpointIds.length || 0} remaining</span>
            </div>
            <button onClick={startCamera} className="w-full py-5 rounded-3xl bg-white text-slate-900 font-bold text-lg flex items-center justify-center gap-3 shadow-xl">
              <Camera className="w-6 h-6" /> Scan Checkpoint
            </button>
            <button onClick={() => endMutation.mutate()} disabled={endMutation.isPending} className="text-white/60 text-sm underline">
              {endMutation.isPending ? 'Ending…' : 'End Round'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
