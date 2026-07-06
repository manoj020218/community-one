import { useState, useRef } from 'react';
import { Mic, MicOff, Loader2 } from 'lucide-react';
import { cn } from '../../utils/cn';

interface VoiceInputFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  type?: string;
  disabled?: boolean;
  className?: string;
}

export function VoiceInputField({
  label, value, onChange, placeholder, required, type = 'text', disabled, className
}: VoiceInputFieldProps) {
  const [isListening, setIsListening] = useState(false);
  const [isSupported] = useState(() => 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window);
  const recognitionRef = useRef<any>(null);

  const startListening = () => {
    if (!isSupported) return;
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    recognitionRef.current = new SpeechRecognition();
    recognitionRef.current.continuous = false;
    recognitionRef.current.lang = 'en-IN';
    recognitionRef.current.interimResults = false;
    recognitionRef.current.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      onChange(value ? `${value} ${transcript}` : transcript);
    };
    recognitionRef.current.onend = () => setIsListening(false);
    recognitionRef.current.onerror = () => setIsListening(false);
    recognitionRef.current.start();
    setIsListening(true);
  };

  const stopListening = () => {
    recognitionRef.current?.stop();
    setIsListening(false);
  };

  return (
    <div className={className}>
      <label className="label">{label}{required && <span className="text-red-500 ml-1">*</span>}</label>
      <div className="relative">
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          className={cn('input pr-10', disabled && 'opacity-60 cursor-not-allowed')}
        />
        {isSupported && !disabled && (
          <button type="button" onClick={isListening ? stopListening : startListening}
            className={cn('absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-lg transition-colors', isListening ? 'text-red-500 hover:bg-red-50' : 'text-slate-400 hover:text-primary-600 hover:bg-primary-50')}>
            {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </button>
        )}
      </div>
      {isListening && (
        <div className="flex items-center gap-1.5 mt-1 text-xs text-red-500">
          <Loader2 className="w-3 h-3 animate-spin" />
          <span>Listening... speak now</span>
        </div>
      )}
    </div>
  );
}
