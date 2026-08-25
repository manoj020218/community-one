import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { LogOut, Languages, ShieldCheck, Footprints } from 'lucide-react';
import toast from 'react-hot-toast';
import { api, extractData } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { useSocietyStore } from '../../store/societyStore';
import { withSocietyQuery } from '../visitor/visitorApi';
import { VisitorFlatTile, VisitorGate, VisitorSettings } from '../visitor/types';
import { TowerFlatPicker } from './TowerFlatPicker';
import { TicketFlowOverlay } from './TicketFlowOverlay';
import { QueueRail } from './QueueRail';
import { KioskTicket, newTicketId, TERMINAL_STAGES } from './guardKiosk.types';
import { KioskLang } from './kioskStrings';
import { useVisitorRealtime } from '../visitor/useVisitorRealtime';

const MAX_DISPLAY_SECONDS = 180;
const RESOLVED_RETENTION_MS = 60_000;

export function GuardKioskPage() {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const { currentSociety } = useSocietyStore();
  const societyId = currentSociety?._id || user?.societyId || '';
  const queryClient = useQueryClient();

  const [lang, setLang] = useState<KioskLang>(() => (localStorage.getItem('kiosk-lang') as KioskLang) || 'en');
  const [tickets, setTickets] = useState<KioskTicket[]>([]);
  const [activeTicketId, setActiveTicketId] = useState<string | null>(null);

  const toggleLang = () => {
    const next: KioskLang = lang === 'en' ? 'hi' : 'en';
    setLang(next);
    localStorage.setItem('kiosk-lang', next);
  };

  const { data: assignments = [] } = useQuery({
    queryKey: ['kiosk-guard-assignments', societyId],
    queryFn: () => extractData<any[]>(api.get(withSocietyQuery('/guard-assignments/me', societyId))),
    enabled: !!societyId,
  });
  const gates = useMemo<VisitorGate[]>(() => {
    const items = assignments.flatMap((a) => a.gateIds || []);
    return Object.values(items.reduce<Record<string, VisitorGate>>((acc, g) => ({ ...acc, [g._id]: g }), {}));
  }, [assignments]);
  const [gateId, setGateId] = useState('');
  const activeGateId = gateId || gates[0]?._id || '';

  const { data: settings } = useQuery({
    queryKey: ['kiosk-visitor-settings', societyId],
    queryFn: () => extractData<VisitorSettings>(api.get(withSocietyQuery('/visitor/settings', societyId))),
    enabled: !!societyId,
  });
  const expirySeconds = Math.min((settings?.defaultApprovalExpiryMinutes || 5) * 60, MAX_DISPLAY_SECONDS);

  const updateTicket = useCallback((ticketId: string, patch: Partial<KioskTicket>) => {
    setTickets((prev) => prev.map((tk) => {
      if (tk.ticketId !== ticketId) return tk;
      const next = { ...tk, ...patch };
      if (patch.stage && TERMINAL_STAGES.includes(patch.stage) && !tk.resolvedAt) next.resolvedAt = Date.now();
      return next;
    }));
  }, []);

  // Single sweep handles both realtime-resolved and locally-timed-out tickets, regardless of
  // which path set resolvedAt — avoids scattering multiple setTimeout-based removal calls.
  useEffect(() => {
    const interval = setInterval(() => {
      setTickets((prev) => prev.filter((tk) => !tk.resolvedAt || Date.now() - tk.resolvedAt < RESOLVED_RETENTION_MS));
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  useVisitorRealtime({
    enabled: !!societyId,
    societyId,
    onEvent: (event) => {
      if (event.type !== 'visitor.request.updated' && event.type !== 'visitor.request.expired') return;
      const requestId = event.data?.requestId;
      const status = event.data?.status;
      if (!requestId || !status) return;
      // Match by requestId regardless of the ticket's current local stage: the guard-facing
      // countdown is capped shorter than the real backend expiry (see MAX_DISPLAY_SECONDS), so
      // a genuine late approval/rejection must still be able to correct a locally-assumed
      // "no response" state rather than being silently dropped.
      setTickets((prev) => prev.map((tk) => {
        if (tk.requestId !== requestId || !['PENDING', 'EXPIRED'].includes(tk.stage)) return tk;
        if (status === 'APPROVED') return { ...tk, stage: 'APPROVED', resolvedAt: Date.now() };
        if (status === 'REJECTED') return { ...tk, stage: 'REJECTED', resolvedAt: Date.now() };
        if (status === 'EXPIRED') return { ...tk, stage: 'EXPIRED', resolvedAt: Date.now() };
        return tk;
      }));
      queryClient.invalidateQueries({ queryKey: ['kiosk-flats'] });
    },
  });

  const handleFlatPhotoReady = (flat: VisitorFlatTile, photo: File) => {
    if (!activeGateId) {
      toast.error(lang === 'hi' ? 'कोई गेट असाइन नहीं है' : 'No gate assigned to your account');
      return;
    }
    const ticketId = newTicketId();
    const ticket: KioskTicket = {
      ticketId, flatId: flat._id, flatNo: flat.flatNo, stage: 'UPLOADING_PHOTO',
      photoFile: photo, visitorName: '', purpose: '', visitorMobile: '', createdAt: Date.now(),
    };
    setTickets((prev) => [...prev, ticket]);
    setActiveTicketId(ticketId);
  };

  if (!user) return null;
  if (user.roleCode !== 'SECURITY_GUARD') {
    navigate('/dashboard', { replace: true });
    return null;
  }

  const activeTicket = tickets.find((tk) => tk.ticketId === activeTicketId) || null;

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 overflow-hidden safe-area-top safe-area-bottom">
      <div className="flex items-center justify-between px-4 py-3 shrink-0">
        <div className="flex items-center gap-2 text-white font-bold">
          <ShieldCheck className="w-5 h-5" />
          <span className="text-sm">{user.name}</span>
        </div>
        <div className="flex items-center gap-2">
          {gates.length > 1 && (
            <select value={activeGateId} onChange={(e) => setGateId(e.target.value)} className="text-xs rounded-xl bg-white/10 border border-white/20 text-white px-2 py-1.5">
              {gates.map((g) => <option key={g._id} value={g._id} className="text-slate-900">{g.name}</option>)}
            </select>
          )}
          <button onClick={toggleLang} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 border border-white/20 text-white text-xs font-bold">
            <Languages className="w-3.5 h-3.5" /> {lang === 'en' ? 'हिंदी' : 'English'}
          </button>
          {user.permissions?.includes('patrol.execute') && (
            <button onClick={() => navigate('/patrol-kiosk')} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 border border-white/20 text-white text-xs font-bold">
              <Footprints className="w-3.5 h-3.5" /> Patrol
            </button>
          )}
          <button onClick={logout} className="p-2 rounded-xl bg-white/10 border border-white/20 text-white/80 hover:text-white">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex flex-col" style={{ height: 'calc(100% - 56px)' }}>
        <div className="flex-1 min-h-0">
          <TowerFlatPicker societyId={societyId} lang={lang} onFlatPhotoReady={handleFlatPhotoReady} />
        </div>
        <QueueRail tickets={tickets} lang={lang} onSelect={setActiveTicketId} />
      </div>

      {activeTicket && (
        <TicketFlowOverlay
          ticket={activeTicket}
          lang={lang}
          societyId={societyId}
          gateId={activeGateId}
          settings={settings}
          expirySeconds={expirySeconds}
          onUpdateTicket={updateTicket}
          onClose={() => setActiveTicketId(null)}
        />
      )}
    </div>
  );
}
