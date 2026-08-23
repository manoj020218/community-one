import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Copy, Check, MessageCircle, Download } from 'lucide-react';
import toast from 'react-hot-toast';
import { Modal } from '../../components/common/Modal';

interface ShareAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  societyName?: string;
}

const APK_PATH = '/downloads/jenix-community.apk';

export function ShareAppModal({ isOpen, onClose, societyName }: ShareAppModalProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const apkUrl = `${window.location.origin}${APK_PATH}`;
  const shareMessage = `Download the ${societyName ? `${societyName} ` : ''}Jenix Community app here:\n${apkUrl}\n\nInstall steps:\n1. Tap the link and download the file\n2. If prompted, allow "Install unknown apps" for your browser\n3. Open the installed app and log in with the username/password shared with you`;

  useEffect(() => {
    if (!isOpen) return;
    QRCode.toDataURL(apkUrl, { width: 220, margin: 1 }).then(setQrDataUrl).catch(() => setQrDataUrl(null));
  }, [isOpen, apkUrl]);

  const copyLink = async () => {
    await navigator.clipboard.writeText(apkUrl);
    setCopied(true);
    toast.success('Link copied');
    setTimeout(() => setCopied(false), 2000);
  };

  const copyMessage = async () => {
    await navigator.clipboard.writeText(shareMessage);
    toast.success('Message copied — paste it alongside their login credentials');
  };

  const shareOnWhatsApp = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(shareMessage)}`, '_blank');
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Share the App">
      <div className="space-y-4">
        <p className="text-sm text-slate-500">
          Until the app is on the Play Store, share this direct-install link with residents, guards, and staff
          along with their login credentials.
        </p>

        {qrDataUrl && (
          <div className="flex flex-col items-center gap-2 p-4 rounded-xl bg-slate-50 border border-slate-100">
            <img src={qrDataUrl} alt="APK download QR code" className="w-40 h-40" />
            <p className="text-xs text-slate-500 text-center">Have them scan this with their phone camera to download directly</p>
          </div>
        )}

        <div className="flex items-center gap-2">
          <input readOnly value={apkUrl} className="input flex-1 text-xs" onFocus={(e) => e.target.select()} />
          <button onClick={copyLink} className="btn-secondary flex-shrink-0 px-3" title="Copy link">
            {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <button onClick={shareOnWhatsApp} className="btn-primary flex-1 flex items-center justify-center gap-2">
            <MessageCircle className="w-4 h-4" /> Share via WhatsApp
          </button>
          <button onClick={copyMessage} className="btn-secondary flex-1 flex items-center justify-center gap-2">
            <Copy className="w-4 h-4" /> Copy Message
          </button>
        </div>

        <a href={apkUrl} download className="flex items-center justify-center gap-2 text-xs text-primary-600 hover:text-primary-700 font-medium">
          <Download className="w-3.5 h-3.5" /> Download APK to this device
        </a>
      </div>
    </Modal>
  );
}
