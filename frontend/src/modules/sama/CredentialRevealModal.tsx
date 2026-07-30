import { useState } from 'react';
import { Copy, Check, AlertTriangle, KeyRound } from 'lucide-react';
import { Modal } from '../../components/common/Modal';
import { GuardCredentials } from './sama.types';

interface CredentialRevealModalProps {
  credentials: GuardCredentials | null;
  onClose: () => void;
}

function CopyField({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <div>
      <label className="label">{label}</label>
      <div className="flex items-center gap-2">
        <input readOnly value={value} className="input font-mono" />
        <button onClick={copy} className="btn-secondary shrink-0 gap-2 px-3" title={`Copy ${label}`}>
          {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
}

export function CredentialRevealModal({ credentials, onClose }: CredentialRevealModalProps) {
  if (!credentials) return null;
  return (
    <Modal isOpen={!!credentials} onClose={onClose} title="Guard Login Credentials">
      <div className="space-y-4">
        <div className="flex items-center gap-3 p-3 rounded-xl bg-amber-50 border border-amber-100">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
          <p className="text-sm text-amber-800">This password is shown only once. Copy it and hand it to the guard now — it cannot be retrieved again later, only reset.</p>
        </div>
        <CopyField label="Username (Mobile Number)" value={credentials.username} />
        <CopyField label="Password" value={credentials.tempPassword} />
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <KeyRound className="w-3.5 h-3.5" />
          The guard can log in at the same app URL — they'll land directly on the visitor entry screen.
        </div>
        <button onClick={onClose} className="btn-primary w-full">Done</button>
      </div>
    </Modal>
  );
}
