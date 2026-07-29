import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, CreditCard, CheckCircle2, XCircle, Ban, AlertOctagon, Paperclip } from 'lucide-react';
import toast from 'react-hot-toast';
import { api, extractData } from '../../services/api';
import { Modal } from '../../components/common/Modal';
import { EmptyState } from '../../components/common/EmptyState';
import { TableSkeleton } from '../../components/common/LoadingSkeleton';
import { useAuthStore } from '../../store/authStore';
import { useSocietyStore } from '../../store/societyStore';
import { cn, formatDate } from '../../utils/cn';
import { hasMcrVerifyAccess } from './mcr.permissions';
import { formatPaise, McrPaymentRecord, MCR_PAYMENT_METHODS, MCR_PAYMENT_STATUSES, PAYMENT_STATUS_BADGE } from './mcr.types';

const BLANK_FORM = {
  flatId: '', payerName: '', payerMobile: '', amountPaise: '', paymentMethod: 'CASH' as string,
  paymentDate: new Date().toISOString().slice(0, 10),
  bankReference: '', upiReference: '', chequeNumber: '', chequeDate: '', bankName: '', cardReference: '', notes: '',
};

export function McrPaymentsTab() {
  const { user } = useAuthStore();
  const { currentSociety } = useSocietyStore();
  const societyId = currentSociety?._id || user?.societyId || '';
  const queryClient = useQueryClient();
  const canVerify = hasMcrVerifyAccess(user?.permissions || []);

  const [statusFilter, setStatusFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(BLANK_FORM);
  const [reasonPrompt, setReasonPrompt] = useState<{ paymentId: string; action: 'reject' | 'cancel' | 'bounce' } | null>(null);
  const [reason, setReason] = useState('');

  const { data: flats } = useQuery({
    queryKey: ['flats-list', societyId],
    queryFn: () => extractData<any>(api.get(`/flats/society/${societyId}?limit=200`)),
    enabled: !!societyId && showModal,
  });

  const { data, isLoading } = useQuery({
    queryKey: ['mcr-payments', societyId, statusFilter],
    queryFn: () => extractData<McrPaymentRecord[]>(api.get('/mcr/payments', { params: { societyId, ...(statusFilter ? { status: statusFilter } : {}) } })),
    enabled: !!societyId,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['mcr-payments'] });

  const recordMutation = useMutation({
    mutationFn: () => api.post('/mcr/payments', {
      societyId,
      flatId: form.flatId,
      payerName: form.payerName,
      payerMobile: form.payerMobile || undefined,
      amountPaise: Math.round(Number(form.amountPaise || 0) * 100),
      paymentMethod: form.paymentMethod,
      paymentDate: form.paymentDate,
      bankReference: form.bankReference || undefined,
      upiReference: form.upiReference || undefined,
      chequeNumber: form.chequeNumber || undefined,
      chequeDate: form.chequeDate || undefined,
      bankName: form.bankName || undefined,
      cardReference: form.cardReference || undefined,
      notes: form.notes || undefined,
    }),
    onSuccess: () => { invalidate(); setShowModal(false); setForm(BLANK_FORM); toast.success('Payment recorded — pending verification'); },
  });

  const verifyMutation = useMutation({
    mutationFn: (paymentId: string) => api.post(`/mcr/payments/${paymentId}/verify`, { societyId }),
    onSuccess: () => { invalidate(); toast.success('Payment verified — receipt issued'); },
  });

  const reasonMutation = useMutation({
    mutationFn: () => {
      if (!reasonPrompt) throw new Error('No payment selected');
      return api.post(`/mcr/payments/${reasonPrompt.paymentId}/${reasonPrompt.action}`, { societyId, reason });
    },
    onSuccess: () => { invalidate(); setReasonPrompt(null); setReason(''); toast.success('Payment updated'); },
  });

  const set = (k: keyof typeof BLANK_FORM) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="input w-auto">
          <option value="">All statuses</option>
          {MCR_PAYMENT_STATUSES.map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
        </select>
        <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2 text-sm">
          <Plus className="w-4 h-4" /> Record Payment
        </button>
      </div>

      {isLoading ? <TableSkeleton rows={5} cols={6} /> : !data?.length ? (
        <EmptyState icon={CreditCard} title="No payments recorded" description="Record a manual payment (cash, cheque, UPI, bank transfer) to begin collection tracking."
          action={<button onClick={() => setShowModal(true)} className="btn-primary">Record Payment</button>} />
      ) : (
        <div className="card overflow-hidden overflow-x-auto">
          <table className="w-full">
            <thead><tr>
              <th className="table-header text-left">Payment #</th>
              <th className="table-header text-left">Payer</th>
              <th className="table-header text-left">Amount</th>
              <th className="table-header text-left">Method</th>
              <th className="table-header text-left">Date</th>
              <th className="table-header text-left">Proof</th>
              <th className="table-header text-left">Status</th>
              <th className="table-header text-left">Actions</th>
            </tr></thead>
            <tbody>
              {data.map((payment) => (
                <tr key={payment._id} className="table-row">
                  <td className="table-cell font-mono text-xs">
                    {payment.paymentNumber}
                    {payment.source === 'RESIDENT_SELF' && <span className="badge badge-blue text-[10px] ml-2">Resident Submitted</span>}
                    {payment.source === 'WHATSAPP_INBOUND' && <span className="badge badge-green text-[10px] ml-2">Via WhatsApp</span>}
                  </td>
                  <td className="table-cell text-sm text-slate-700">{payment.payerName}</td>
                  <td className="table-cell font-semibold">{formatPaise(payment.amountPaise)}</td>
                  <td className="table-cell"><span className="badge badge-gray text-xs">{payment.paymentMethod.replace('_', ' ')}</span></td>
                  <td className="table-cell text-xs text-slate-500">{formatDate(payment.paymentDate)}</td>
                  <td className="table-cell">
                    {payment.proofFileIds?.length ? (
                      <div className="flex flex-col gap-1">
                        {payment.proofFileIds.map((f, i) => {
                          const url = typeof f === 'string' ? undefined : f.url;
                          return url ? (
                            <a key={i} href={url} target="_blank" rel="noreferrer" className="text-primary-600 hover:text-primary-700 flex items-center gap-1 text-xs">
                              <Paperclip className="w-3 h-3" /> View
                            </a>
                          ) : null;
                        })}
                      </div>
                    ) : <span className="text-xs text-slate-400">—</span>}
                  </td>
                  <td className="table-cell"><span className={cn('badge', PAYMENT_STATUS_BADGE[payment.status])}>{payment.status.replace('_', ' ')}</span></td>
                  <td className="table-cell">
                    {payment.status === 'PENDING_VERIFICATION' && (
                      <div className="flex gap-2">
                        {canVerify && (
                          <button onClick={() => verifyMutation.mutate(payment._id)} disabled={verifyMutation.isPending} className="text-emerald-600 hover:text-emerald-700" title="Verify">
                            <CheckCircle2 className="w-4 h-4" />
                          </button>
                        )}
                        <button onClick={() => setReasonPrompt({ paymentId: payment._id, action: 'reject' })} className="text-red-600 hover:text-red-700" title="Reject">
                          <XCircle className="w-4 h-4" />
                        </button>
                        <button onClick={() => setReasonPrompt({ paymentId: payment._id, action: 'cancel' })} className="text-slate-500 hover:text-slate-700" title="Cancel">
                          <Ban className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                    {payment.paymentMethod === 'CHEQUE' && payment.status === 'VERIFIED' && (
                      <button onClick={() => setReasonPrompt({ paymentId: payment._id, action: 'bounce' })} className="text-amber-600 hover:text-amber-700 flex items-center gap-1 text-xs" title="Mark bounced">
                        <AlertOctagon className="w-4 h-4" /> Bounce
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Record Payment" size="lg">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div><label className="label">Flat <span className="text-red-500">*</span></label>
              <select value={form.flatId} onChange={(e) => set('flatId')(e.target.value)} className="input">
                <option value="">Select flat...</option>
                {flats?.items?.map((f: any) => <option key={f._id} value={f._id}>{f.flatNo}</option>)}
              </select></div>
            <div><label className="label">Amount (₹) <span className="text-red-500">*</span></label>
              <input type="number" value={form.amountPaise} onChange={(e) => set('amountPaise')(e.target.value)} className="input" min={0} /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="label">Payer Name <span className="text-red-500">*</span></label>
              <input value={form.payerName} onChange={(e) => set('payerName')(e.target.value)} className="input" /></div>
            <div><label className="label">Payer Mobile</label>
              <input value={form.payerMobile} onChange={(e) => set('payerMobile')(e.target.value)} className="input" /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="label">Payment Method</label>
              <select value={form.paymentMethod} onChange={(e) => set('paymentMethod')(e.target.value)} className="input">
                {MCR_PAYMENT_METHODS.filter((m) => m !== 'PAYMENT_GATEWAY').map((m) => <option key={m}>{m.replace('_', ' ')}</option>)}
              </select></div>
            <div><label className="label">Payment Date</label>
              <input type="date" value={form.paymentDate} onChange={(e) => set('paymentDate')(e.target.value)} className="input" /></div>
          </div>

          {form.paymentMethod === 'CHEQUE' && (
            <div className="grid grid-cols-3 gap-4">
              <div><label className="label">Cheque Number <span className="text-red-500">*</span></label>
                <input value={form.chequeNumber} onChange={(e) => set('chequeNumber')(e.target.value)} className="input" /></div>
              <div><label className="label">Cheque Date <span className="text-red-500">*</span></label>
                <input type="date" value={form.chequeDate} onChange={(e) => set('chequeDate')(e.target.value)} className="input" /></div>
              <div><label className="label">Bank Name <span className="text-red-500">*</span></label>
                <input value={form.bankName} onChange={(e) => set('bankName')(e.target.value)} className="input" /></div>
            </div>
          )}
          {form.paymentMethod === 'UPI' && (
            <div><label className="label">UPI Reference (UTR) <span className="text-red-500">*</span></label>
              <input value={form.upiReference} onChange={(e) => set('upiReference')(e.target.value)} className="input" /></div>
          )}
          {form.paymentMethod === 'BANK_TRANSFER' && (
            <div><label className="label">Bank Reference <span className="text-red-500">*</span></label>
              <input value={form.bankReference} onChange={(e) => set('bankReference')(e.target.value)} className="input" /></div>
          )}
          {form.paymentMethod === 'CARD_OFFLINE' && (
            <div><label className="label">Card Terminal Reference <span className="text-red-500">*</span></label>
              <input value={form.cardReference} onChange={(e) => set('cardReference')(e.target.value)} className="input" /></div>
          )}

          <div><label className="label">Notes</label>
            <textarea value={form.notes} onChange={(e) => set('notes')(e.target.value)} className="input resize-none" rows={2} /></div>

          <div className="flex gap-3 pt-2">
            <button onClick={() => recordMutation.mutate()} disabled={recordMutation.isPending || !form.flatId || !form.payerName || !form.amountPaise} className="btn-primary flex-1">
              {recordMutation.isPending ? 'Recording...' : 'Record Payment'}
            </button>
            <button onClick={() => setShowModal(false)} className="btn-secondary">Cancel</button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={!!reasonPrompt} onClose={() => { setReasonPrompt(null); setReason(''); }} title={`${reasonPrompt?.action === 'reject' ? 'Reject' : reasonPrompt?.action === 'cancel' ? 'Cancel' : 'Mark Bounced'} Payment`}>
        <div className="space-y-4">
          <div><label className="label">Reason <span className="text-red-500">*</span></label>
            <textarea value={reason} onChange={(e) => setReason(e.target.value)} className="input resize-none" rows={3} placeholder="Required — minimum 3 characters" /></div>
          <div className="flex gap-3 pt-2">
            <button onClick={() => reasonMutation.mutate()} disabled={reasonMutation.isPending || reason.trim().length < 3} className="btn-danger flex-1">
              {reasonMutation.isPending ? 'Submitting...' : 'Confirm'}
            </button>
            <button onClick={() => { setReasonPrompt(null); setReason(''); }} className="btn-secondary">Cancel</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
