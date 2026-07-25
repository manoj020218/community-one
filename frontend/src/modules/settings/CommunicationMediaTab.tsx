import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Mail, MessageCircle, Radio, Save, Send, Unplug } from 'lucide-react';
import toast from 'react-hot-toast';
import { api, extractData } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { useSocietyStore } from '../../store/societyStore';
import { CommunicationSettings, WhatsAppStatus } from './communicationTypes';

const SMTP_BLANK = { host: '', port: 587, secure: false, username: '', password: '', fromEmail: '', fromName: '', enabled: false };

export function CommunicationMediaTab() {
  const { user } = useAuthStore();
  const { currentSociety } = useSocietyStore();
  const societyId = currentSociety?._id || user?.societyId || '';
  const queryClient = useQueryClient();

  const { data: settings } = useQuery({
    queryKey: ['communication-settings', societyId],
    queryFn: () => extractData<CommunicationSettings>(api.get('/communication/settings', { params: { societyId } })),
    enabled: !!societyId,
  });

  const { data: waStatus } = useQuery({
    queryKey: ['whatsapp-status', societyId],
    queryFn: () => extractData<WhatsAppStatus>(api.get('/communication/whatsapp/status', { params: { societyId } })),
    enabled: !!societyId,
    refetchInterval: (query) => (query.state.data?.status === 'CONNECTING' ? 3000 : false),
  });

  const connectMutation = useMutation({
    mutationFn: () => api.post('/communication/whatsapp/connect', { societyId }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['whatsapp-status'] }),
  });
  const disconnectMutation = useMutation({
    mutationFn: () => api.post('/communication/whatsapp/disconnect', { societyId }),
    onSuccess: () => {
      toast.success('WhatsApp disconnected');
      queryClient.invalidateQueries({ queryKey: ['whatsapp-status'] });
    },
  });

  const [smtpForm, setSmtpForm] = useState(SMTP_BLANK);
  useEffect(() => {
    if (settings?.smtp) setSmtpForm({ ...SMTP_BLANK, ...settings.smtp });
  }, [settings?.smtp]);

  const smtpMutation = useMutation({
    mutationFn: (payload: typeof smtpForm) => api.patch('/communication/settings/smtp', { ...payload, societyId }),
    onSuccess: () => {
      toast.success('SMTP settings saved');
      queryClient.invalidateQueries({ queryKey: ['communication-settings'] });
    },
    onError: (err: any) => toast.error(err?.response?.data?.error?.message || 'Failed to save SMTP settings'),
  });

  const [testEmail, setTestEmail] = useState('');
  const testMutation = useMutation({
    mutationFn: () => api.post('/communication/settings/smtp/test', { societyId, toEmail: testEmail }),
    onSuccess: () => toast.success('Test email sent!'),
    onError: (err: any) => toast.error(err?.response?.data?.error?.message || 'Failed to send test email'),
  });

  const waStatusBadge: Record<string, string> = {
    DISCONNECTED: 'badge-gray',
    CONNECTING: 'badge-yellow',
    CONNECTED: 'badge-green',
  };

  return (
    <div className="space-y-6 max-w-2xl">
      {/* WhatsApp */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2"><MessageCircle className="w-4 h-4 text-slate-400" /><h3 className="font-semibold text-slate-700">WhatsApp Number</h3></div>
          <span className={`badge ${waStatusBadge[waStatus?.status || 'DISCONNECTED']}`}>{(waStatus?.status || 'DISCONNECTED').toLowerCase()}</span>
        </div>
        <p className="text-xs text-slate-500 mb-4">
          Link one WhatsApp number for all society communication — scan the QR with that phone's WhatsApp app, the same way you'd link WhatsApp Web.
        </p>

        {waStatus?.status === 'CONNECTED' && (
          <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-50 border border-emerald-100">
            <p className="text-sm text-emerald-800">Linked number: +{waStatus.phoneNumber}</p>
            <button onClick={() => disconnectMutation.mutate()} disabled={disconnectMutation.isPending} className="btn-secondary text-sm gap-2">
              <Unplug className="w-4 h-4" /> Disconnect
            </button>
          </div>
        )}

        {waStatus?.status === 'CONNECTING' && waStatus.qrDataUrl && (
          <div className="flex flex-col items-center gap-3 p-4 rounded-xl bg-slate-50 border border-slate-100">
            <img src={waStatus.qrDataUrl} alt="WhatsApp QR code" className="w-48 h-48" />
            <p className="text-xs text-slate-500 text-center">Open WhatsApp on the phone you want to link → Settings → Linked Devices → Link a Device, then scan this code.</p>
          </div>
        )}

        {(!waStatus || waStatus.status === 'DISCONNECTED') && (
          <button onClick={() => connectMutation.mutate()} disabled={connectMutation.isPending} className="btn-primary text-sm gap-2">
            {connectMutation.isPending ? 'Starting…' : 'Connect WhatsApp'}
          </button>
        )}
      </div>

      {/* SMTP Email */}
      <div className="card p-6">
        <div className="flex items-center gap-2 mb-5"><Mail className="w-4 h-4 text-slate-400" /><h3 className="font-semibold text-slate-700">Email (SMTP)</h3></div>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div><label className="label">SMTP Host</label><input value={smtpForm.host} onChange={(e) => setSmtpForm((f) => ({ ...f, host: e.target.value }))} className="input" placeholder="smtp.gmail.com" /></div>
            <div><label className="label">Port</label><input type="number" value={smtpForm.port} onChange={(e) => setSmtpForm((f) => ({ ...f, port: Number(e.target.value) }))} className="input" placeholder="587" /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="label">Username</label><input value={smtpForm.username} onChange={(e) => setSmtpForm((f) => ({ ...f, username: e.target.value }))} className="input" placeholder="noreply@yoursociety.com" /></div>
            <div><label className="label">Password</label><input type="password" value={smtpForm.password} onChange={(e) => setSmtpForm((f) => ({ ...f, password: e.target.value }))} className="input" placeholder="••••••••" /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="label">From Email</label><input type="email" value={smtpForm.fromEmail} onChange={(e) => setSmtpForm((f) => ({ ...f, fromEmail: e.target.value }))} className="input" placeholder="noreply@yoursociety.com" /></div>
            <div><label className="label">From Name</label><input value={smtpForm.fromName} onChange={(e) => setSmtpForm((f) => ({ ...f, fromName: e.target.value }))} className="input" placeholder="Your Society Name" /></div>
          </div>
          <label className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 cursor-pointer">
            <div><p className="text-sm font-medium text-slate-700">Use TLS/SSL (secure)</p><p className="text-xs text-slate-500">Enable for port 465, leave off for 587 with STARTTLS</p></div>
            <input type="checkbox" checked={smtpForm.secure} onChange={(e) => setSmtpForm((f) => ({ ...f, secure: e.target.checked }))} className="w-5 h-5 text-indigo-600 rounded" />
          </label>
          <label className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 cursor-pointer">
            <div><p className="text-sm font-medium text-slate-700">Enabled</p><p className="text-xs text-slate-500">Turn on to actually send email through this configuration</p></div>
            <input type="checkbox" checked={smtpForm.enabled} onChange={(e) => setSmtpForm((f) => ({ ...f, enabled: e.target.checked }))} className="w-5 h-5 text-indigo-600 rounded" />
          </label>
          <button onClick={() => smtpMutation.mutate(smtpForm)} disabled={smtpMutation.isPending} className="btn-primary flex items-center gap-2 text-sm">
            <Save className="w-4 h-4" />{smtpMutation.isPending ? 'Saving...' : 'Save SMTP Settings'}
          </button>

          <div className="pt-3 border-t border-slate-100 flex items-center gap-3">
            <input type="email" value={testEmail} onChange={(e) => setTestEmail(e.target.value)} placeholder="Send a test email to..." className="input flex-1" />
            <button onClick={() => testMutation.mutate()} disabled={testMutation.isPending || !testEmail} className="btn-secondary flex items-center gap-2 text-sm shrink-0">
              <Send className="w-4 h-4" />{testMutation.isPending ? 'Sending...' : 'Send Test'}
            </button>
          </div>
        </div>
      </div>

      {/* Communication Gateway — future */}
      <div className="card p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2"><Radio className="w-4 h-4 text-slate-400" /><h3 className="font-semibold text-slate-700">Communication Gateway (SMS + Missed-Call Alerts)</h3></div>
          <span className="badge badge-yellow">Coming Soon</span>
        </div>
        <p className="text-xs text-slate-500 mt-2">
          Purchase a SIM7600-based IoT gateway to send SMS and trigger missed-call alerts directly from your society — no dependency on WhatsApp or email delivery.
        </p>
      </div>
    </div>
  );
}
