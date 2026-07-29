import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Save, Settings2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { api, extractData } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { useSocietyStore } from '../../store/societyStore';
import { McrSettings } from './mcr.types';

const BLANK: McrSettings = {
  financialYearStartMonth: 4, defaultCurrency: 'INR', societyTimezone: 'Asia/Kolkata',
  receiptPrefix: 'MCR', demandNumberPrefix: 'MCRD', defaultDueDays: 15, gracePeriodDays: 0,
  lateFeeEnabled: false, lateFeeAmountPaise: 0, lateFeeIntervalDays: 30,
  makerCheckerEnabled: true, allowSelfVerification: false, allowAdvancePayment: true,
  allowPartialPayment: true, allowResidentPaymentSubmission: false, publicReceiptVerificationEnabled: false,
  collectionUpiId: '', collectionUpiPayeeName: '',
};

export function McrSettingsTab() {
  const { user } = useAuthStore();
  const { currentSociety } = useSocietyStore();
  const societyId = currentSociety?._id || user?.societyId || '';
  const queryClient = useQueryClient();
  const [form, setForm] = useState<McrSettings>(BLANK);

  const { data: settings } = useQuery({
    queryKey: ['mcr-settings', societyId],
    queryFn: () => extractData<McrSettings>(api.get('/mcr/settings', { params: { societyId } })),
    enabled: !!societyId,
  });

  useEffect(() => { if (settings) setForm(settings); }, [settings]);

  const saveMutation = useMutation({
    mutationFn: () => api.patch('/mcr/settings', { ...form, societyId }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['mcr-settings'] }); toast.success('MCR settings saved'); },
  });

  const setNum = (k: keyof McrSettings) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [k]: Number(e.target.value) }));
  const setBool = (k: keyof McrSettings) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [k]: e.target.checked }));
  const setStr = (k: keyof McrSettings) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const toggles: Array<{ key: keyof McrSettings; label: string; desc: string }> = [
    { key: 'makerCheckerEnabled', label: 'Maker-checker verification', desc: 'Require a separate person to verify recorded payments' },
    { key: 'allowSelfVerification', label: 'Allow self-verification', desc: 'Let the person who recorded a payment also verify it' },
    { key: 'allowAdvancePayment', label: 'Allow advance payments', desc: 'Overpayments become advance credit applied to future demands' },
    { key: 'allowPartialPayment', label: 'Allow partial payments', desc: 'Payments smaller than the outstanding amount are accepted' },
    { key: 'allowResidentPaymentSubmission', label: 'Allow resident payment submission', desc: 'Residents can submit UPI payment proof in-app, or by replying with a screenshot to a WhatsApp reminder — both land here for your verification' },
    { key: 'publicReceiptVerificationEnabled', label: 'Public receipt verification', desc: 'Anyone with a receipt link can verify its authenticity' },
    { key: 'lateFeeEnabled', label: 'Late fees', desc: 'Automatically generate late-fee demands for overdue dues' },
  ];

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="card p-6">
        <div className="flex items-center gap-2 mb-5"><Settings2 className="w-4 h-4 text-slate-400" /><h3 className="font-semibold text-slate-700">Numbering & Billing Cycle</h3></div>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div><label className="label">Receipt Prefix</label>
              <input value={form.receiptPrefix} onChange={setStr('receiptPrefix')} className="input" /></div>
            <div><label className="label">Demand Number Prefix</label>
              <input value={form.demandNumberPrefix} onChange={setStr('demandNumberPrefix')} className="input" /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="label">Default Due Days</label>
              <input type="number" min={0} max={90} value={form.defaultDueDays} onChange={setNum('defaultDueDays')} className="input" /></div>
            <div><label className="label">Grace Period Days</label>
              <input type="number" min={0} max={90} value={form.gracePeriodDays} onChange={setNum('gracePeriodDays')} className="input" /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="label">Financial Year Start Month</label>
              <input type="number" min={1} max={12} value={form.financialYearStartMonth} onChange={setNum('financialYearStartMonth')} className="input" /></div>
            <div><label className="label">Society Timezone</label>
              <input value={form.societyTimezone} onChange={setStr('societyTimezone')} className="input" /></div>
          </div>
          {form.lateFeeEnabled && (
            <div className="grid grid-cols-2 gap-4">
              <div><label className="label">Late Fee Amount (₹)</label>
                <input type="number" min={0} value={form.lateFeeAmountPaise / 100} onChange={(e) => setForm((f) => ({ ...f, lateFeeAmountPaise: Math.round(Number(e.target.value || 0) * 100) }))} className="input" /></div>
              <div><label className="label">Late Fee Interval (days)</label>
                <input type="number" min={1} max={365} value={form.lateFeeIntervalDays} onChange={setNum('lateFeeIntervalDays')} className="input" /></div>
            </div>
          )}
        </div>
      </div>

      <div className="card p-6">
        <div className="flex items-center gap-2 mb-5"><Settings2 className="w-4 h-4 text-slate-400" /><h3 className="font-semibold text-slate-700">UPI Collection Details</h3></div>
        <p className="text-xs text-slate-500 mb-4">
          Residents pay this UPI ID directly and submit their transaction reference with a screenshot for your verification — no payment gateway required.
        </p>
        <div className="grid grid-cols-2 gap-4">
          <div><label className="label">Society UPI ID</label>
            <input value={form.collectionUpiId} onChange={setStr('collectionUpiId')} className="input" placeholder="society@upi" /></div>
          <div><label className="label">Payee Name</label>
            <input value={form.collectionUpiPayeeName} onChange={setStr('collectionUpiPayeeName')} className="input" placeholder="Your Society Name" /></div>
        </div>
        <button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} className="btn-primary flex items-center gap-2 text-sm mt-4">
          <Save className="w-4 h-4" />{saveMutation.isPending ? 'Saving...' : 'Save UPI Details'}
        </button>
      </div>

      <div className="card p-6">
        <div className="flex items-center gap-2 mb-5"><Settings2 className="w-4 h-4 text-slate-400" /><h3 className="font-semibold text-slate-700">Collection Policy</h3></div>
        <div className="space-y-3">
          {toggles.map(({ key, label, desc }) => (
            <label key={key} className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 cursor-pointer">
              <div><p className="text-sm font-medium text-slate-700">{label}</p><p className="text-xs text-slate-500">{desc}</p></div>
              <input type="checkbox" checked={form[key] as boolean} onChange={setBool(key)} className="w-5 h-5 text-indigo-600 rounded" />
            </label>
          ))}
        </div>
        <button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} className="btn-primary flex items-center gap-2 text-sm mt-5">
          <Save className="w-4 h-4" />{saveMutation.isPending ? 'Saving...' : 'Save MCR Settings'}
        </button>
      </div>
    </div>
  );
}
