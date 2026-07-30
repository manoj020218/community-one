import { Clock, CheckCircle2, XCircle } from 'lucide-react';
import { cn } from '../../utils/cn';
import { KioskTicket } from './guardKiosk.types';
import { KIOSK_STRINGS, KioskLang } from './kioskStrings';

interface QueueRailProps {
  tickets: KioskTicket[];
  lang: KioskLang;
  onSelect: (ticketId: string) => void;
}

const PENDING_STAGES = ['UPLOADING_PHOTO', 'NAME_INPUT', 'PURPOSE_INPUT', 'MOBILE_INPUT', 'SUBMITTING', 'PENDING'];

export function QueueRail({ tickets, lang, onSelect }: QueueRailProps) {
  const t = KIOSK_STRINGS[lang];
  if (!tickets.length) return null;

  return (
    <div className="shrink-0 px-4 pb-4 pt-2">
      <p className="text-white/50 text-xs font-semibold uppercase tracking-wide mb-2 px-1">{t.queueTitle}</p>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {tickets.map((ticket) => {
          const isPending = PENDING_STAGES.includes(ticket.stage);
          const isApproved = ticket.stage === 'APPROVED';
          const isRejected = ticket.stage === 'REJECTED' || ticket.stage === 'EXPIRED';
          return (
            <button
              key={ticket.ticketId}
              onClick={() => onSelect(ticket.ticketId)}
              className={cn(
                'shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-2xl border font-bold text-sm backdrop-blur-xl transition-all',
                isPending && 'bg-amber-500/20 border-amber-300/40 text-amber-100 animate-blink-ring',
                isApproved && 'bg-emerald-500/25 border-emerald-300/50 text-emerald-50',
                isRejected && 'bg-rose-500/25 border-rose-300/50 text-rose-50'
              )}
            >
              {isPending && <Clock className="w-4 h-4" />}
              {isApproved && <CheckCircle2 className="w-4 h-4" />}
              {isRejected && <XCircle className="w-4 h-4" />}
              {ticket.flatNo}
            </button>
          );
        })}
      </div>
    </div>
  );
}
