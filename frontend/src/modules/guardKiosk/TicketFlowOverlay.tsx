import { useEffect, useRef, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { CheckCircle2, XCircle, Clock, Loader2, ChevronLeft, X } from 'lucide-react';
import { api, extractData } from '../../services/api';
import { cn } from '../../utils/cn';
import { VisitorSettings } from '../visitor/types';
import { VoiceHoldButton } from './VoiceHoldButton';
import { KIOSK_STRINGS, KioskLang, speak } from './kioskStrings';
import { KioskTicket } from './guardKiosk.types';

interface TicketFlowOverlayProps {
  ticket: KioskTicket;
  lang: KioskLang;
  societyId: string;
  gateId: string;
  settings?: VisitorSettings;
  expirySeconds: number;
  onUpdateTicket: (ticketId: string, patch: Partial<KioskTicket>) => void;
  onClose: () => void;
}

function FieldStep(props: {
  title: string;
  prompt: string;
  value: string;
  onChange: (v: string) => void;
  lang: KioskLang;
  required: boolean;
  type?: string;
  onNext: () => void;
  onBack: () => void;
  onSkip?: () => void;
  photoFile?: File;
}) {
  const t = KIOSK_STRINGS[props.lang];
  const spokenRef = useRef(false);

  useEffect(() => {
    if (!spokenRef.current) {
      spokenRef.current = true;
      speak(props.prompt, props.lang);
    }
  }, [props.prompt, props.lang]);

  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!props.photoFile) { setPhotoUrl(null); return; }
    const url = URL.createObjectURL(props.photoFile);
    setPhotoUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [props.photoFile]);

  return (
    <div className="flex flex-col items-center justify-center h-full px-6 gap-8 animate-pop-in">
      <button onClick={props.onBack} className="absolute top-6 left-6 text-white/70 hover:text-white flex items-center gap-1 text-sm">
        <ChevronLeft className="w-5 h-5" /> {t.backToFlats}
      </button>

      {photoUrl && (
        <img src={photoUrl} alt="Visitor" className="w-20 h-20 rounded-2xl object-cover border-2 border-white/40 shadow-lg absolute top-6 right-6" />
      )}

      <p className="text-white text-2xl font-bold text-center">{props.title}</p>
      <p className="text-white/70 text-sm text-center -mt-6">{props.prompt}</p>

      <VoiceHoldButton lang={props.lang} label={t.holdToSpeak} onTranscript={(text) => props.onChange((props.value ? props.value + ' ' : '') + text)} />

      <input
        type={props.type || 'text'}
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        className="w-full max-w-md text-center text-xl py-4 px-4 rounded-2xl bg-white/15 border border-white/30 text-white placeholder-white/40 backdrop-blur-xl focus:outline-none focus:ring-2 focus:ring-white/50"
        placeholder={t.typeInstead}
      />

      <div className="flex gap-3 w-full max-w-md">
        {props.onSkip && (
          <button onClick={props.onSkip} className="flex-1 py-3.5 rounded-2xl bg-white/10 border border-white/20 text-white/80 font-semibold">
            {t.skip}
          </button>
        )}
        <button
          onClick={props.onNext}
          disabled={props.required && !props.value.trim()}
          className="flex-[2] py-3.5 rounded-2xl bg-white text-slate-900 font-bold text-lg disabled:opacity-40 transition-opacity"
        >
          {t.next}
        </button>
      </div>
    </div>
  );
}

export function TicketFlowOverlay({ ticket, lang, societyId, gateId, settings, expirySeconds, onUpdateTicket, onClose }: TicketFlowOverlayProps) {
  const t = KIOSK_STRINGS[lang];
  const [secondsLeft, setSecondsLeft] = useState(expirySeconds);
  const uploadStartedRef = useRef(false);
  const submitStartedRef = useRef(false);

  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!ticket.photoFile) throw new Error('No photo');
      const fd = new FormData();
      fd.append('file', ticket.photoFile);
      fd.append('societyId', societyId);
      fd.append('moduleCode', 'VISITOR');
      fd.append('accessLevel', 'PRIVATE');
      const uploaded = await extractData<{ _id: string }>(api.post('/files/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } }));
      return uploaded._id;
    },
    onSuccess: (photoFileId) => onUpdateTicket(ticket.ticketId, { photoFileId, stage: 'NAME_INPUT' }),
    onError: () => onUpdateTicket(ticket.ticketId, { error: 'Photo upload failed', stage: 'NAME_INPUT' }),
  });

  const submitMutation = useMutation({
    mutationFn: () => extractData<{ _id: string }>(api.post('/visitor/requests', {
      societyId,
      flatId: ticket.flatId,
      gateId,
      visitorName: ticket.visitorName.trim(),
      visitorMobile: ticket.visitorMobile.trim() || undefined,
      purpose: ticket.purpose.trim() || undefined,
      visitorPhotoFileId: ticket.photoFileId,
    })),
    onSuccess: (req) => onUpdateTicket(ticket.ticketId, { requestId: req._id, stage: 'PENDING' }),
    onError: (err: any) => onUpdateTicket(ticket.ticketId, { error: err?.response?.data?.error?.message || 'Failed to send request', stage: 'MOBILE_INPUT' }),
  });

  useEffect(() => {
    if (ticket.stage === 'UPLOADING_PHOTO' && !uploadStartedRef.current) {
      uploadStartedRef.current = true;
      uploadMutation.mutate();
    }
    if (ticket.stage === 'SUBMITTING' && !submitStartedRef.current) {
      submitStartedRef.current = true;
      submitMutation.mutate();
    }
    if (ticket.stage !== 'SUBMITTING') submitStartedRef.current = false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticket.stage]);

  useEffect(() => {
    if (ticket.stage !== 'PENDING') return;
    setSecondsLeft(expirySeconds);
    const interval = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(interval);
          onUpdateTicket(ticket.ticketId, { stage: 'EXPIRED' });
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticket.stage, ticket.requestId]);

  useEffect(() => {
    if (['APPROVED', 'REJECTED', 'EXPIRED'].includes(ticket.stage)) {
      const timer = setTimeout(onClose, 4000);
      return () => clearTimeout(timer);
    }
  }, [ticket.stage, onClose]);

  const patch = (field: 'visitorName' | 'purpose' | 'visitorMobile') => (v: string) => onUpdateTicket(ticket.ticketId, { [field]: v });

  return (
    <div className="fixed inset-0 z-50 animate-slide-in-right">
      <div className={cn(
        'absolute inset-0 transition-colors duration-500',
        ticket.stage === 'APPROVED' ? 'bg-gradient-to-br from-emerald-500 to-emerald-700' :
        ticket.stage === 'REJECTED' || ticket.stage === 'EXPIRED' ? 'bg-gradient-to-br from-rose-500 to-rose-700' :
        'bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-700'
      )} />
      <div className="absolute inset-0 backdrop-blur-sm" />

      <button onClick={onClose} className="absolute top-6 right-6 z-10 text-white/70 hover:text-white p-2 rounded-full bg-white/10">
        <X className="w-5 h-5" />
      </button>

      <div className="relative h-full flex flex-col">
        <div className="text-center pt-6 text-white/80 text-sm font-semibold tracking-wide">
          {ticket.flatNo}
        </div>

        <div className="flex-1 relative">
          {ticket.stage === 'UPLOADING_PHOTO' && (
            <div className="flex flex-col items-center justify-center h-full gap-4 text-white">
              <Loader2 className="w-12 h-12 animate-spin" />
              <p>{t.takePhoto}</p>
            </div>
          )}

          {ticket.stage === 'NAME_INPUT' && (
            <FieldStep title={t.guestName} prompt={t.guestNamePrompt} value={ticket.visitorName} onChange={patch('visitorName')} lang={lang} required
              photoFile={ticket.photoFile}
              onNext={() => onUpdateTicket(ticket.ticketId, { stage: 'PURPOSE_INPUT' })} onBack={onClose} />
          )}

          {ticket.stage === 'PURPOSE_INPUT' && (
            <FieldStep title={t.purpose} prompt={t.purposePrompt} value={ticket.purpose} onChange={patch('purpose')} lang={lang}
              required={!!settings?.requirePurpose}
              photoFile={ticket.photoFile}
              onSkip={settings?.requirePurpose ? undefined : () => onUpdateTicket(ticket.ticketId, { stage: 'MOBILE_INPUT' })}
              onNext={() => onUpdateTicket(ticket.ticketId, { stage: 'MOBILE_INPUT' })} onBack={() => onUpdateTicket(ticket.ticketId, { stage: 'NAME_INPUT' })} />
          )}

          {ticket.stage === 'MOBILE_INPUT' && (
            <FieldStep title={t.mobile} prompt={t.mobilePrompt} value={ticket.visitorMobile} onChange={patch('visitorMobile')} lang={lang} type="tel"
              required={!!settings?.requireVisitorMobile}
              photoFile={ticket.photoFile}
              onSkip={settings?.requireVisitorMobile ? undefined : () => onUpdateTicket(ticket.ticketId, { stage: 'SUBMITTING' })}
              onNext={() => onUpdateTicket(ticket.ticketId, { stage: 'SUBMITTING' })} onBack={() => onUpdateTicket(ticket.ticketId, { stage: 'PURPOSE_INPUT' })} />
          )}

          {ticket.stage === 'SUBMITTING' && (
            <div className="flex flex-col items-center justify-center h-full gap-4 text-white">
              <Loader2 className="w-12 h-12 animate-spin" />
              <p className="text-lg font-semibold">{t.sending}</p>
            </div>
          )}

          {ticket.stage === 'PENDING' && (
            <div className="flex flex-col items-center justify-center h-full gap-6 text-white">
              <div className="relative flex items-center justify-center w-40 h-40">
                <Loader2 className="w-40 h-40 animate-spin text-white/30 absolute" />
                <Clock className="w-12 h-12" />
              </div>
              <p className="text-2xl font-bold">{t.waiting}</p>
              <p className="text-white/70">{t.waitingSub}</p>
              <p className="text-4xl font-mono font-bold tabular-nums">{secondsLeft}s</p>
            </div>
          )}

          {ticket.stage === 'APPROVED' && (
            <div className="flex flex-col items-center justify-center h-full gap-4 text-white animate-pop-in">
              <CheckCircle2 className="w-32 h-32 animate-blink-ring rounded-full" />
              <p className="text-4xl font-extrabold">{t.accepted}</p>
            </div>
          )}

          {(ticket.stage === 'REJECTED' || ticket.stage === 'EXPIRED') && (
            <div className="flex flex-col items-center justify-center h-full gap-4 text-white animate-pop-in">
              <XCircle className="w-32 h-32" />
              <p className="text-4xl font-extrabold">{ticket.stage === 'REJECTED' ? t.rejected : t.expired}</p>
            </div>
          )}

          {ticket.error && ['NAME_INPUT', 'MOBILE_INPUT'].includes(ticket.stage) && (
            <p className="absolute bottom-4 left-0 right-0 text-center text-rose-200 text-sm">{ticket.error}</p>
          )}
        </div>
      </div>
    </div>
  );
}
