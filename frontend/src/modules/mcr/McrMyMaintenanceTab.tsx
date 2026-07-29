import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Wallet, FileText, Receipt as ReceiptIcon, Download, CreditCard, Upload } from 'lucide-react';
import toast from 'react-hot-toast';
import { api, extractData } from '../../services/api';
import { EmptyState } from '../../components/common/EmptyState';
import { Modal } from '../../components/common/Modal';
import { TableSkeleton } from '../../components/common/LoadingSkeleton';
import { StatCard } from '../../components/common/StatCard';
import { useAuthStore } from '../../store/authStore';
import { useSocietyStore } from '../../store/societyStore';
import { cn, formatDate } from '../../utils/cn';
import { DEMAND_STATUS_BADGE, formatPaise, McrSettings, McrStatement, McrUpiQr, PAYMENT_STATUS_BADGE, openMcrDocument } from './mcr.types';

export function McrMyMaintenanceTab() {
  const { user } = useAuthStore();
  const { currentSociety } = useSocietyStore();
  const societyId = currentSociety?._id || user?.societyId || '';
  const flatId = user?.flatId || '';
  const queryClient = useQueryClient();
  const [showPayModal, setShowPayModal] = useState(false);
  const [amountRupees, setAmountRupees] = useState('');
  const [upiReference, setUpiReference] = useState('');
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [notes, setNotes] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['mcr-statement', societyId, flatId],
    queryFn: () => extractData<McrStatement>(api.get('/mcr/reports/statement', { params: { societyId, flatId } })),
    enabled: !!societyId && !!flatId,
  });

  const { data: settings } = useQuery({
    queryKey: ['mcr-settings', societyId],
    queryFn: () => extractData<McrSettings>(api.get('/mcr/settings', { params: { societyId } })),
    enabled: !!societyId,
  });

  const amountPaise = Math.round(Number(amountRupees || 0) * 100);
  const { data: upiQr } = useQuery({
    queryKey: ['mcr-upi-qr', societyId, amountPaise],
    queryFn: () => extractData<McrUpiQr>(api.get('/mcr/payments/upi-qr', { params: { societyId, amountPaise: amountPaise || undefined } })),
    enabled: !!societyId && showPayModal,
  });

  const resetForm = () => { setAmountRupees(''); setUpiReference(''); setScreenshot(null); setNotes(''); };

  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!screenshot) throw new Error('Screenshot is required');
      const fd = new FormData();
      fd.append('file', screenshot);
      fd.append('societyId', societyId);
      fd.append('moduleCode', 'MCR');
      fd.append('entityType', 'MCR_PAYMENT_PROOF');
      const uploaded = await extractData<{ _id: string }>(api.post('/files/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } }));
      return api.post('/mcr/payments/self', {
        societyId, amountPaise, upiReference, notes: notes || undefined, proofFileIds: [uploaded._id],
      });
    },
    onSuccess: () => {
      toast.success('Payment submitted — your society admin will verify it shortly');
      queryClient.invalidateQueries({ queryKey: ['mcr-statement'] });
      setShowPayModal(false);
      resetForm();
    },
    onError: (err: any) => toast.error(err?.response?.data?.error?.message || 'Failed to submit payment'),
  });

  if (!flatId) {
    return <EmptyState icon={Wallet} title="No flat linked" description="Your account is not linked to a flat, so maintenance details are unavailable." />;
  }

  if (isLoading) return <TableSkeleton rows={4} cols={4} />;

  const outstandingDemands = (data?.demands || []).filter((d) => d.status === 'PUBLISHED' || d.status === 'PARTIALLY_PAID' || d.status === 'OVERDUE');
  const nextDue = outstandingDemands.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())[0];
  const outstandingPaise = data?.summary.outstandingPaise || 0;

  const openPayModal = () => {
    setAmountRupees(outstandingPaise > 0 ? (outstandingPaise / 100).toFixed(2) : '');
    setShowPayModal(true);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard title="Outstanding" value={formatPaise(data?.summary.outstandingPaise)} icon={Wallet} color="amber" />
        <StatCard title="Next Due Date" value={nextDue ? formatDate(nextDue.dueDate) : '—'} icon={FileText} color="blue" />
        <StatCard title="Receipts" value={data?.summary.issuedReceiptCount ?? 0} icon={ReceiptIcon} color="green" />
      </div>

      {outstandingPaise > 0 && settings?.allowResidentPaymentSubmission && (
        <button onClick={openPayModal} className="btn-primary flex items-center gap-2">
          <CreditCard className="w-4 h-4" /> Pay via UPI
        </button>
      )}

      <div className="card overflow-hidden">
        <div className="p-4 border-b border-slate-100"><h3 className="section-title">Maintenance Demands</h3></div>
        {!data?.demands?.length ? (
          <EmptyState icon={FileText} title="No demands yet" description="Maintenance demands for your flat will appear here once published." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr>
                <th className="table-header text-left">Period</th>
                <th className="table-header text-left">Due Date</th>
                <th className="table-header text-left">Total</th>
                <th className="table-header text-left">Outstanding</th>
                <th className="table-header text-left">Status</th>
              </tr></thead>
              <tbody>
                {data.demands.map((demand) => (
                  <tr key={demand._id} className="table-row">
                    <td className="table-cell font-medium text-slate-800">{demand.billingPeriodLabel}</td>
                    <td className="table-cell text-xs text-slate-500">{formatDate(demand.dueDate)}</td>
                    <td className="table-cell">{formatPaise(demand.totalDemandPaise)}</td>
                    <td className="table-cell font-semibold">{formatPaise(demand.outstandingPaise)}</td>
                    <td className="table-cell"><span className={cn('badge', DEMAND_STATUS_BADGE[demand.status])}>{demand.status.replace('_', ' ')}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {!!data?.payments?.filter((p) => p.status !== 'VERIFIED').length && (
        <div className="card overflow-hidden">
          <div className="p-4 border-b border-slate-100"><h3 className="section-title">My Payment Submissions</h3></div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr>
                <th className="table-header text-left">Amount</th>
                <th className="table-header text-left">UPI Reference</th>
                <th className="table-header text-left">Submitted</th>
                <th className="table-header text-left">Status</th>
              </tr></thead>
              <tbody>
                {data!.payments.filter((p) => p.status !== 'VERIFIED').map((payment) => (
                  <tr key={payment._id} className="table-row">
                    <td className="table-cell font-semibold">{formatPaise(payment.amountPaise)}</td>
                    <td className="table-cell text-xs text-slate-500 font-mono">{payment.upiReference || '—'}</td>
                    <td className="table-cell text-xs text-slate-500">{formatDate(payment.paymentDate)}</td>
                    <td className="table-cell">
                      <span className={cn('badge', PAYMENT_STATUS_BADGE[payment.status])}>{payment.status.replace('_', ' ')}</span>
                      {payment.status === 'REJECTED' && payment.rejectionReason && (
                        <p className="text-xs text-red-600 mt-1">{payment.rejectionReason}</p>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="card overflow-hidden">
        <div className="p-4 border-b border-slate-100"><h3 className="section-title">Receipts</h3></div>
        {!data?.receipts?.length ? (
          <EmptyState icon={ReceiptIcon} title="No receipts yet" description="Receipts for verified payments will appear here." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr>
                <th className="table-header text-left">Receipt #</th>
                <th className="table-header text-left">Date</th>
                <th className="table-header text-left">Amount</th>
                <th className="table-header text-left">Status</th>
                <th className="table-header text-left">Action</th>
              </tr></thead>
              <tbody>
                {data.receipts.map((receipt) => (
                  <tr key={receipt._id} className="table-row">
                    <td className="table-cell font-medium text-slate-800">{receipt.receiptNumber}</td>
                    <td className="table-cell text-xs text-slate-500">{formatDate(receipt.issuedAt)}</td>
                    <td className="table-cell">{formatPaise(receipt.amountPaise)}</td>
                    <td className="table-cell"><span className="badge badge-green">{receipt.status}</span></td>
                    <td className="table-cell">
                      <button
                        onClick={() => openMcrDocument(api, `/mcr/receipts/${receipt._id}/download?societyId=${societyId}`)}
                        className="text-primary-600 hover:text-primary-700 flex items-center gap-1 text-xs font-medium"
                      >
                        <Download className="w-3.5 h-3.5" /> Download
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal isOpen={showPayModal} onClose={() => { setShowPayModal(false); resetForm(); }} title="Pay via UPI" size="lg">
        <div className="space-y-4">
          {upiQr && !upiQr.configured && (
            <p className="text-sm text-amber-600 bg-amber-50 rounded-xl p-3">
              Your society hasn't set up UPI collection details yet. Please contact your society admin.
            </p>
          )}
          {upiQr?.configured && (
            <div className="flex flex-col items-center gap-3 p-4 rounded-xl bg-slate-50 border border-slate-100">
              {upiQr.qrDataUrl && <img src={upiQr.qrDataUrl} alt="UPI QR code" className="w-48 h-48" />}
              <p className="text-sm font-medium text-slate-700">{upiQr.payeeName}</p>
              <p className="text-xs text-slate-500 font-mono">{upiQr.upiId}</p>
              <p className="text-xs text-slate-500 text-center">Scan with any UPI app and pay, then enter the transaction reference and upload a screenshot below.</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div><label className="label">Amount (₹) <span className="text-red-500">*</span></label>
              <input type="number" value={amountRupees} onChange={(e) => setAmountRupees(e.target.value)} className="input" min={0} /></div>
            <div><label className="label">UPI Reference (UTR) <span className="text-red-500">*</span></label>
              <input value={upiReference} onChange={(e) => setUpiReference(e.target.value)} className="input" placeholder="From your UPI app" /></div>
          </div>

          <div>
            <label className="label">Payment Screenshot <span className="text-red-500">*</span></label>
            <label className="flex items-center gap-2 justify-center border-2 border-dashed border-slate-200 rounded-xl p-4 cursor-pointer hover:bg-slate-50 text-sm text-slate-500">
              <Upload className="w-4 h-4" />
              {screenshot ? screenshot.name : 'Choose screenshot to upload'}
              <input type="file" accept="image/*" className="hidden" onChange={(e) => setScreenshot(e.target.files?.[0] || null)} />
            </label>
          </div>

          <div><label className="label">Notes</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="input resize-none" rows={2} placeholder="Optional" /></div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={() => submitMutation.mutate()}
              disabled={submitMutation.isPending || !amountPaise || !upiReference.trim() || !screenshot}
              className="btn-primary flex-1"
            >
              {submitMutation.isPending ? 'Submitting...' : 'Submit for Verification'}
            </button>
            <button onClick={() => { setShowPayModal(false); resetForm(); }} className="btn-secondary">Cancel</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
