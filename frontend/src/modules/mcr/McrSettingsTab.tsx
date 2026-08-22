import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Save, Settings2, Bell, MessageCircle, Mail, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { api, extractData } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { useSocietyStore } from '../../store/societyStore';
import { cn } from '../../utils/cn';
import { McrSettings } from './mcr.types';
import { CommunicationSettings } from '../settings/communicationTypes';

const BLANK: McrSettings = {
  financialYearStartMonth: 4, defaultCurrency: 'INR', societyTimezone: 'Asia/Kolkata',
  receiptPrefix: 'MCR', demandNumberPrefix: 'MCRD', defaultDueDays: 15, gracePeriodDays: 0,
  lateFeeEnabled: false, lateFeeAmountPaise: 0, lateFeeIntervalDays: 30,
  makerCheckerEnabled: true, allowSelfVerification: false, allowAdvancePayment: true,
  allowPartialPayment: true, allowResidentPaymentSubmission: false, publicReceiptVerificationEnabled: false,
  collectionUpiId: '', collectionUpiPayeeName: '',
  reminderAutomationEnabled: false, reminderFrequencyDays: 1, reminderTimeOfDay: '10:00',
  vacantFlatPolicy: 'BILL_FULL', vacantFlatReducedPercent: 50,
  unsoldFlatPolicy: 'EXEMPT', unsoldFlatReducedPercent: 50,
};

export function McrSettingsTab() {
  const { user } = useAuthStore();
  const { currentSociety } = useSocietyStore();
  const societyId = currentSociety?._id || user?.societyId || '';
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [form, setForm] = useState<McrSettings>(BLANK);

  const { data: settings } = useQuery({
    queryKey: ['mcr-settings', societyId],
    queryFn: () => extractData<McrSettings>(api.get('/mcr/settings', { params: { societyId } })),
    enabled: !!societyId,
  });

  // Reminders send over these — surfaced here (read-only, managed on the Settings page) so an
  // admin turning on reminder automation immediately sees whether WhatsApp/email will actually
  // deliver, instead of only finding out when reminders silently fail to send.
  const { data: commSettings } = useQuery({
    queryKey: ['communication-settings', societyId],
    queryFn: () => extractData<CommunicationSettings>(api.get('/communication/settings', { params: { societyId } })),
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
  const setPolicy = (k: keyof McrSettings) => (e: React.ChangeEvent<HTMLSelectElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));

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
        <div className="flex items-center gap-2 mb-5"><Bell className="w-4 h-4 text-slate-400" /><h3 className="font-semibold text-slate-700">Automated Reminders</h3></div>

        <button onClick={() => navigate('/settings')} className="w-full flex items-center gap-4 p-3 mb-4 rounded-xl border border-slate-100 hover:bg-slate-50 transition-colors text-left">
          <div className="flex items-center gap-2 text-xs">
            <MessageCircle className={cn('w-3.5 h-3.5', commSettings?.whatsapp.status === 'CONNECTED' ? 'text-emerald-600' : 'text-red-500')} />
            <span className={commSettings?.whatsapp.status === 'CONNECTED' ? 'text-emerald-700' : 'text-red-600'}>
              WhatsApp {commSettings?.whatsapp.status === 'CONNECTED' ? 'connected' : 'not connected'}
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <Mail className={cn('w-3.5 h-3.5', commSettings?.smtp.enabled ? 'text-emerald-600' : 'text-slate-400')} />
            <span className={commSettings?.smtp.enabled ? 'text-emerald-700' : 'text-slate-500'}>
              Email {commSettings?.smtp.enabled ? 'configured' : 'not configured'}
            </span>
          </div>
          <span className="ml-auto flex items-center gap-1 text-xs text-primary-600 font-medium flex-shrink-0">
            Manage in Settings <ArrowRight className="w-3 h-3" />
          </span>
        </button>

        <label className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 cursor-pointer mb-1">
          <div>
            <p className="text-sm font-medium text-slate-700">Send reminders automatically</p>
            <p className="text-xs text-slate-500">Off by default. When on, residents with outstanding dues get a reminder on the schedule below, on every enabled channel (in-app, email, WhatsApp).</p>
          </div>
          <input type="checkbox" checked={form.reminderAutomationEnabled} onChange={setBool('reminderAutomationEnabled')} className="w-5 h-5 text-indigo-600 rounded flex-shrink-0 ml-3" />
        </label>
        {form.reminderAutomationEnabled && (
          <div className="grid grid-cols-2 gap-4 p-3">
            <div><label className="label">Repeat every</label>
              <div className="flex items-center gap-2">
                <input type="number" min={1} max={14} value={form.reminderFrequencyDays} onChange={setNum('reminderFrequencyDays')} className="input w-24" />
                <span className="text-sm text-slate-500">day(s)</span>
              </div>
            </div>
            <div><label className="label">Send at</label>
              <input type="time" value={form.reminderTimeOfDay} onChange={setStr('reminderTimeOfDay')} className="input" /></div>
          </div>
        )}
        <button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} className="btn-primary flex items-center gap-2 text-sm mt-4">
          <Save className="w-4 h-4" />{saveMutation.isPending ? 'Saving...' : 'Save Reminder Schedule'}
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

      <div className="card p-6">
        <div className="flex items-center gap-2 mb-2"><Settings2 className="w-4 h-4 text-slate-400" /><h3 className="font-semibold text-slate-700">Vacant & Unsold Flat Billing</h3></div>
        <p className="text-xs text-slate-500 mb-5">
          Most society bylaws still hold an owner liable for maintenance on a flat they own but don't live in — it funds common-area
          upkeep, not personal usage. Builder-unsold inventory is usually the one exception. Choosing "Exempt" doesn't skip billing
          silently — a demand is still generated every cycle so there's a clean paper trail, it's just held back from auto-publish
          until you (or the flat's occupancy status) says otherwise.
        </p>
        <div className="space-y-5">
          <div>
            <p className="text-sm font-medium text-slate-700 mb-2">Vacant flats <span className="text-xs font-normal text-slate-400">— owned, but nobody currently living there</span></p>
            <div className="flex items-center gap-3">
              <select value={form.vacantFlatPolicy} onChange={setPolicy('vacantFlatPolicy')} className="input w-auto">
                <option value="BILL_FULL">Bill in full</option>
                <option value="BILL_REDUCED">Bill at a reduced rate</option>
                <option value="EXEMPT">Exempt (still accrues)</option>
              </select>
              {form.vacantFlatPolicy === 'BILL_REDUCED' && (
                <div className="flex items-center gap-2">
                  <input type="number" min={0} max={100} value={form.vacantFlatReducedPercent} onChange={setNum('vacantFlatReducedPercent')} className="input w-20" />
                  <span className="text-sm text-slate-500">% of normal amount</span>
                </div>
              )}
            </div>
          </div>
          <div>
            <p className="text-sm font-medium text-slate-700 mb-2">Builder-unsold flats <span className="text-xs font-normal text-slate-400">— not yet handed over to a buyer</span></p>
            <div className="flex items-center gap-3">
              <select value={form.unsoldFlatPolicy} onChange={setPolicy('unsoldFlatPolicy')} className="input w-auto">
                <option value="BILL_FULL">Bill in full</option>
                <option value="BILL_REDUCED">Bill at a reduced rate</option>
                <option value="EXEMPT">Exempt (still accrues)</option>
              </select>
              {form.unsoldFlatPolicy === 'BILL_REDUCED' && (
                <div className="flex items-center gap-2">
                  <input type="number" min={0} max={100} value={form.unsoldFlatReducedPercent} onChange={setNum('unsoldFlatReducedPercent')} className="input w-20" />
                  <span className="text-sm text-slate-500">% of normal amount</span>
                </div>
              )}
            </div>
          </div>
        </div>
        <button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} className="btn-primary flex items-center gap-2 text-sm mt-5">
          <Save className="w-4 h-4" />{saveMutation.isPending ? 'Saving...' : 'Save Billing Policy'}
        </button>
      </div>
    </div>
  );
}
