import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, CreditCard, TrendingUp, Clock, CheckCircle2 } from 'lucide-react';
import { api, extractData } from '../../services/api';
import { PageHeader } from '../../components/common/PageHeader';
import { EmptyState } from '../../components/common/EmptyState';
import { Modal } from '../../components/common/Modal';
import { StatCard } from '../../components/common/StatCard';
import { useAuthStore } from '../../store/authStore';
import { useSocietyStore } from '../../store/societyStore';
import { PaymentRecord } from '../../types';
import { formatCurrency, formatDate } from '../../utils/cn';
import toast from 'react-hot-toast';
import { cn } from '../../utils/cn';

const PAYMENT_MODES = ['CASH','UPI','BANK_TRANSFER','CHEQUE','ONLINE_GATEWAY','ADJUSTMENT','WAIVER'];

export function PaymentPage() {
  const { user } = useAuthStore();
  const { currentSociety } = useSocietyStore();
  const societyId = currentSociety?._id || user?.societyId || '';
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ societyId, flatId: '', amount: '', paymentPurpose: '', paymentMode: 'UPI', remarks: '' });

  const { data: flats } = useQuery({ queryKey: ['flats-list', societyId], queryFn: () => extractData<any>(api.get(`/flats/society/${societyId}?limit=200`)), enabled: !!societyId });
  const { data: summary } = useQuery({ queryKey: ['payment-summary', societyId], queryFn: () => extractData<any>(api.get(`/payments/society/${societyId}/summary`)), enabled: !!societyId });
  const { data, isLoading } = useQuery({ queryKey: ['payments', societyId], queryFn: () => extractData<any>(api.get(`/payments/society/${societyId}?limit=50`)), enabled: !!societyId });

  const mutation = useMutation({
    mutationFn: (d: any) => api.post('/payments', d),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['payments'] }); queryClient.invalidateQueries({ queryKey: ['payment-summary'] }); setShowModal(false); toast.success('Payment recorded!'); },
  });

  const set = (k: string) => (v: string) => setForm((f) => ({ ...f, [k]: v }));
  const statusColors: Record<string, string> = { RECEIVED: 'badge-green', PENDING: 'badge-yellow', FAILED: 'badge-red', CANCELLED: 'badge-gray', REFUNDED: 'badge-blue' };

  return (
    <div className="space-y-6">
      <PageHeader title="Payments" subtitle="Track and manage all payment records"
        action={<button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2"><Plus className="w-4 h-4" /> Record Payment</button>} />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard title="Total Collected" value={formatCurrency(summary?.received || 0)} icon={TrendingUp} color="green" />
        <StatCard title="Pending" value={formatCurrency(summary?.pending || 0)} icon={Clock} color="amber" />
        <StatCard title="Total Records" value={data?.total || 0} icon={CheckCircle2} color="blue" />
      </div>

      <div className="card overflow-hidden">
        {isLoading ? <div className="p-8 text-center text-slate-400">Loading...</div> :
         !data?.items?.length ? (
          <EmptyState icon={CreditCard} title="No payments recorded" description="Record your first payment to get started"
            action={<button onClick={() => setShowModal(true)} className="btn-primary">Record Payment</button>} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr className="border-b border-slate-100">
                <th className="table-header text-left">Purpose</th>
                <th className="table-header text-left">Flat</th>
                <th className="table-header text-left">Amount</th>
                <th className="table-header text-left">Mode</th>
                <th className="table-header text-left">Status</th>
                <th className="table-header text-left">Date</th>
              </tr></thead>
              <tbody className="divide-y divide-slate-50">
                {data.items.map((p: PaymentRecord) => (
                  <tr key={p._id} className="table-row">
                    <td className="table-cell font-medium text-slate-800 text-sm">{p.paymentPurpose}</td>
                    <td className="table-cell text-xs text-slate-600">{(p.flatId as any)?.flatNo || 'N/A'}</td>
                    <td className="table-cell font-semibold text-slate-900">{formatCurrency(p.amount)}</td>
                    <td className="table-cell"><span className="badge badge-gray text-xs">{p.paymentMode}</span></td>
                    <td className="table-cell"><span className={cn('badge', statusColors[p.paymentStatus] || 'badge-gray')}>{p.paymentStatus}</span></td>
                    <td className="table-cell text-xs text-slate-500">{formatDate(p.paymentDate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Record Payment">
        <div className="space-y-4">
          <div><label className="label">Flat <span className="text-red-500">*</span></label>
            <select value={form.flatId} onChange={(e) => set('flatId')(e.target.value)} className="input" required>
              <option value="">Select flat...</option>
              {flats?.items?.map((f: any) => <option key={f._id} value={f._id}>{f.flatNo}</option>)}
            </select></div>
          <div><label className="label">Amount (₹) <span className="text-red-500">*</span></label>
            <input type="number" value={form.amount} onChange={(e) => set('amount')(e.target.value)} placeholder="5000" className="input" required min={0} /></div>
          <div><label className="label">Purpose <span className="text-red-500">*</span></label>
            <input type="text" value={form.paymentPurpose} onChange={(e) => set('paymentPurpose')(e.target.value)} placeholder="Monthly Maintenance" className="input" required /></div>
          <div><label className="label">Payment Mode</label>
            <select value={form.paymentMode} onChange={(e) => set('paymentMode')(e.target.value)} className="input">
              {PAYMENT_MODES.map((m) => <option key={m}>{m}</option>)}</select></div>
          <div><label className="label">Remarks</label>
            <textarea value={form.remarks} onChange={(e) => set('remarks')(e.target.value)} placeholder="Optional remarks..." className="input resize-none" rows={2} /></div>
          <div className="flex gap-3 pt-2">
            <button onClick={() => mutation.mutate({ ...form, societyId, amount: Number(form.amount) })} disabled={mutation.isPending} className="btn-primary flex-1">{mutation.isPending ? 'Recording...' : 'Record Payment'}</button>
            <button onClick={() => setShowModal(false)} className="btn-secondary">Cancel</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
