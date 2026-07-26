import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CreditCard, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import { api, extractData } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { useSocietyStore } from '../../store/societyStore';
import { McrGatewayConfig } from './mcr.types';

const BLANK = { enabled: false, publicKey: '', secretKey: '', webhookSecret: '', autoVerifySuccessfulPayments: true };

export function McrGatewayTab() {
  const { user } = useAuthStore();
  const { currentSociety } = useSocietyStore();
  const societyId = currentSociety?._id || user?.societyId || '';
  const queryClient = useQueryClient();
  const [form, setForm] = useState(BLANK);

  const { data: config } = useQuery({
    queryKey: ['mcr-gateway-config', societyId],
    queryFn: () => extractData<McrGatewayConfig>(api.get('/mcr/gateway/config', { params: { societyId } })),
    enabled: !!societyId,
  });

  useEffect(() => {
    if (config) setForm((f) => ({ ...f, enabled: config.enabled, publicKey: config.publicKey || '', autoVerifySuccessfulPayments: config.autoVerifySuccessfulPayments }));
  }, [config]);

  const saveMutation = useMutation({
    mutationFn: () => api.patch('/mcr/gateway/config', {
      societyId,
      provider: 'MOCK',
      enabled: form.enabled,
      publicKey: form.publicKey || undefined,
      secretKey: form.secretKey || undefined,
      webhookSecret: form.webhookSecret || undefined,
      autoVerifySuccessfulPayments: form.autoVerifySuccessfulPayments,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mcr-gateway-config'] });
      setForm((f) => ({ ...f, secretKey: '', webhookSecret: '' }));
      toast.success('Gateway configuration saved');
    },
  });

  const testOrderMutation = useMutation({
    mutationFn: () => extractData<{ paymentId: string; status: string }>(api.post('/mcr/gateway/orders', { societyId, amountPaise: 100, payerName: 'Test Order' })),
    onSuccess: (order) => toast.success(`Test order created (status: ${order.status})`),
  });

  const set = (k: keyof typeof BLANK) => (v: string | boolean) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="card p-6">
        <div className="flex items-center gap-2 mb-5"><CreditCard className="w-4 h-4 text-slate-400" /><h3 className="font-semibold text-slate-700">Payment Gateway (Mock Provider)</h3></div>
        <p className="text-xs text-slate-500 mb-4">
          The initial release ships a mock payment-gateway provider so the demand-to-payment-to-receipt flow can be exercised end to end.
          Live provider integrations (e.g. Razorpay) will reuse this same configuration shape without changing MCR's domain model.
        </p>
        <div className="space-y-4">
          <label className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 cursor-pointer">
            <div><p className="text-sm font-medium text-slate-700">Enabled</p><p className="text-xs text-slate-500">Allow residents to create gateway payment orders</p></div>
            <input type="checkbox" checked={form.enabled} onChange={(e) => set('enabled')(e.target.checked)} className="w-5 h-5 text-indigo-600 rounded" />
          </label>
          <div><label className="label">Public Key</label>
            <input value={form.publicKey} onChange={(e) => set('publicKey')(e.target.value)} className="input" placeholder="pk_test_..." /></div>
          <div><label className="label">Secret Key</label>
            <input type="password" value={form.secretKey} onChange={(e) => set('secretKey')(e.target.value)} className="input" placeholder="Never shown after saving" /></div>
          <div><label className="label">Webhook Secret</label>
            <input type="password" value={form.webhookSecret} onChange={(e) => set('webhookSecret')(e.target.value)} className="input" placeholder="Never shown after saving" /></div>
          <label className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 cursor-pointer">
            <div><p className="text-sm font-medium text-slate-700">Auto-verify successful payments</p><p className="text-xs text-slate-500">Skip manual verification when the mock provider reports success</p></div>
            <input type="checkbox" checked={form.autoVerifySuccessfulPayments} onChange={(e) => set('autoVerifySuccessfulPayments')(e.target.checked)} className="w-5 h-5 text-indigo-600 rounded" />
          </label>
          <div className="flex gap-3">
            <button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} className="btn-primary flex-1">
              {saveMutation.isPending ? 'Saving...' : 'Save Configuration'}
            </button>
            <button onClick={() => testOrderMutation.mutate()} disabled={testOrderMutation.isPending || !form.enabled} className="btn-secondary flex items-center gap-2">
              <ShieldCheck className="w-4 h-4" /> {testOrderMutation.isPending ? 'Testing...' : 'Create Test Order'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
