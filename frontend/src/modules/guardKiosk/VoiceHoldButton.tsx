import { useEffect, useRef, useState } from 'react';
import { Mic } from 'lucide-react';
import toast from 'react-hot-toast';
import { cn } from '../../utils/cn';
import { KIOSK_STRINGS, KioskLang } from './kioskStrings';

interface VoiceHoldButtonProps {
  lang: KioskLang;
  onTranscript: (text: string) => void;
  label: string;
  compact?: boolean;
}

const SpeechRecognitionCtor = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

export function VoiceHoldButton({ lang, onTranscript, label, compact }: VoiceHoldButtonProps) {
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  useEffect(() => () => recognitionRef.current?.stop(), []);

  if (!SpeechRecognitionCtor) return null;

  const start = (e: React.PointerEvent) => {
    e.preventDefault();
    const recognition = new SpeechRecognitionCtor();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = lang === 'hi' ? 'hi-IN' : 'en-IN';
    recognition.onresult = (event: any) => {
      const transcript = Array.from(event.results as any).map((r: any) => r[0].transcript).join(' ');
      onTranscript(transcript);
    };
    recognition.onend = () => setIsListening(false);
    recognition.onerror = (event: any) => {
      setIsListening(false);
      if (event?.error === 'no-speech' || event?.error === 'aborted') return;
      toast.error(KIOSK_STRINGS[lang].voiceUnavailable);
    };
    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  };

  const stop = () => {
    recognitionRef.current?.stop();
    setIsListening(false);
  };

  if (compact) {
    return (
      <button
        type="button"
        onPointerDown={start}
        onPointerUp={stop}
        onPointerLeave={stop}
        onPointerCancel={stop}
        title={label}
        className={cn(
          'relative flex items-center justify-center rounded-full w-10 h-10 shrink-0 select-none touch-none transition-all',
          'shadow-lg backdrop-blur-xl border',
          isListening
            ? 'bg-rose-500/90 border-rose-300 scale-110 animate-pulse'
            : 'bg-white/20 border-white/30 hover:bg-white/30 active:scale-95'
        )}
      >
        <Mic className={cn('w-4 h-4', isListening ? 'text-white' : 'text-white/90')} />
      </button>
    );
  }

  return (
    <button
      type="button"
      onPointerDown={start}
      onPointerUp={stop}
      onPointerLeave={stop}
      onPointerCancel={stop}
      className={cn(
        'relative flex flex-col items-center justify-center gap-2 rounded-full w-32 h-32 select-none touch-none transition-all',
        'shadow-lg backdrop-blur-xl border',
        isListening
          ? 'bg-rose-500/90 border-rose-300 scale-110 animate-pulse'
          : 'bg-white/20 border-white/30 hover:bg-white/30 active:scale-95'
      )}
    >
      <Mic className={cn('w-10 h-10', isListening ? 'text-white' : 'text-white/90')} />
      <span className="text-xs font-semibold text-white/90 px-2 text-center">{label}</span>
    </button>
  );
}
