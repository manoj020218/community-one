import { useState } from 'react';
import { Copy, Check, AlertTriangle, MessageCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { Modal } from '../../components/common/Modal';
import { getApkUrl } from '../../utils/apkShare';

export interface NewUserCredentials {
  name: string;
  roleLabel: string;
  email: string;
  mobile: string;
  password: string;
}

interface ShareCredentialsModalProps {
  credentials: NewUserCredentials | null;
  onClose: () => void;
  societyName?: string;
}

function CopyField({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    toast.success('Copied');
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <div>
      <label className="label">{label}</label>
      <div className="flex items-center gap-2">
        <input readOnly value={value} className="input font-mono" onFocus={(e) => e.target.select()} />
        <button onClick={copy} className="btn-secondary shrink-0 px-3" title={`Copy ${label}`}>
          {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
}

function buildMessage(c: NewUserCredentials, societyName?: string) {
  const apkUrl = getApkUrl();
  return `Welcome${societyName ? ` to ${societyName}` : ''}! You've been added as ${c.roleLabel} on the Jenix Community app.\n\nYour login details:\nMobile: ${c.mobile}\nPassword: ${c.password}\n\nDownload the app here:\n${apkUrl}\n\nInstall steps:\n1. Tap the link and download the file\n2. If prompted, allow "Install unknown apps" for your browser\n3. Open the app and log in with the details above`;
}

function normalizeMobileForWa(mobile: string): string | null {
  const digits = mobile.replace(/\D/g, '');
  if (digits.length === 10) return `91${digits}`;
  if (digits.length === 12 && digits.startsWith('91')) return digits;
  return null;
}

export function ShareCredentialsModal({ credentials, onClose, societyName }: ShareCredentialsModalProps) {
  if (!credentials) return null;
  const message = buildMessage(credentials, societyName);
  const waNumber = normalizeMobileForWa(credentials.mobile);

  const copyMessage = () => {
    navigator.clipboard.writeText(message);
    toast.success('Message copied');
  };

  const shareOnWhatsApp = () => {
    const base = waNumber ? `https://wa.me/${waNumber}` : 'https://wa.me/';
    window.open(`${base}?text=${encodeURIComponent(message)}`, '_blank');
  };

  return (
    <Modal isOpen={!!credentials} onClose={onClose} title="Share Login Credentials">
      <div className="space-y-4">
        <div className="flex items-center gap-3 p-3 rounded-xl bg-amber-50 border border-amber-100">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
          <p className="text-sm text-amber-800">
            Copy these now — the password isn't stored anywhere you can look up later, only reset.
          </p>
        </div>

        <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
          <p className="text-sm font-semibold text-slate-800">{credentials.name}</p>
          <p className="text-xs text-slate-500">{credentials.roleLabel}</p>
        </div>

        <CopyField label="Login ID (Mobile)" value={credentials.mobile} />
        <CopyField label="Password" value={credentials.password} />

        <div className="flex flex-col sm:flex-row gap-2 pt-1">
          <button onClick={shareOnWhatsApp} className="btn-primary flex-1 flex items-center justify-center gap-2">
            <MessageCircle className="w-4 h-4" /> Share via WhatsApp
          </button>
          <button onClick={copyMessage} className="btn-secondary flex-1 flex items-center justify-center gap-2">
            <Copy className="w-4 h-4" /> Copy Message
          </button>
        </div>
        {!waNumber && (
          <p className="text-xs text-slate-400 -mt-2">
            Mobile number doesn't look like a 10-digit Indian number — WhatsApp will open without a pre-filled recipient.
          </p>
        )}

        <p className="text-xs text-slate-400">
          The message includes the app download link and install steps, so this is everything they need to get started.
        </p>

        <button onClick={onClose} className="btn-secondary w-full">Done</button>
      </div>
    </Modal>
  );
}
