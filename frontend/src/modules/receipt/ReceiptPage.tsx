import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Receipt, Download } from 'lucide-react';
import { api, extractData } from '../../services/api';
import { PageHeader } from '../../components/common/PageHeader';
import { EmptyState } from '../../components/common/EmptyState';
import { Modal } from '../../components/common/Modal';
import { TableSkeleton } from '../../components/common/LoadingSkeleton';
import { useAuthStore } from '../../store/authStore';
import { useSocietyStore } from '../../store/societyStore';
import { formatCurrency, formatDate } from '../../utils/cn';
import toast from 'react-hot-toast';

export function ReceiptPage() {
  const { user } = useAuthStore();
  const { currentSociety } = useSocietyStore();
  const societyId = currentSociety?._id || user?.societyId || '';
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [page, setPage] = useState(1);
  const [form, setForm] = useState({ societyId, paymentId: '', residentId: '', remarks: '' });

  const { data: payments } = useQuery({ queryKey: ['payments-list', societyId], queryFn: () => extractData<any>(api.get(`/payments/society/${societyId}?limit=200&status=RECEIVED`)), enabled: !!societyId });
  const { data, isLoading } = useQuery({ queryKey: ['receipts', societyId, page], queryFn: () => extractData<any>(api.get(`/receipts/society/${societyId}?page=${page}&limit=20`)), enabled: !!societyId });

  const mutation = useMutation({
    mutationFn: (d: any) => api.post('/receipts', d),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['receipts'] }); setShowModal(false); toast.success('Receipt generated!'); setForm({ societyId, paymentId: '', residentId: '', remarks: '' }); },
  });

  const set = (k: string) => (v: string) => setForm((f) => ({ ...f, [k]: v }));
  const receipts: any[] = data?.items || [];

  return (
    <div className="space-y-6">
      <PageHeader title="Receipts" subtitle="Generate and manage payment receipts"
        action={<button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2"><Plus className="w-4 h-4" /> Generate Receipt</button>} />

      {isLoading ? <TableSkeleton rows={6} cols={5} /> : (
        <div className="card overflow-hidden">
          {receipts.length === 0 ? (
            <EmptyState icon={Receipt} title="No receipts yet" description="Generate receipts for received payments"
              action={<button onClick={() => setShowModal(true)} className="btn-primary">Generate Receipt</button>} />
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead><tr className="border-b border-slate-100">
                    <th className="table-header text-left">Receipt No</th>
                    <th className="table-header text-left">Resident</th>
                    <th className="table-header text-left">Amount</th>
                    <th className="table-header text-left">Purpose</th>
                    <th className="table-header text-left">Date</th>
                    <th className="table-header text-left">Actions</th>
                  </tr></thead>
                  <tbody className="divide-y divide-slate-50">
                    {receipts.map((r: any) => (
                      <tr key={r._id} className="table-row">
                        <td className="table-cell font-mono text-sm font-bold text-indigo-700">{r.receiptNumber}</td>
                        <td className="table-cell text-sm text-slate-700">{(r.residentId as any)?.name || '—'}</td>
                        <td className="table-cell font-semibold text-slate-900">{formatCurrency(r.amount || 0)}</td>
                        <td className="table-cell text-sm text-slate-600">{r.purpose || '—'}</td>
                        <td className="table-cell text-xs text-slate-500">{formatDate(r.createdAt)}</td>
                        <td className="table-cell">
                          {r.pdfUrl ? <a href={r.pdfUrl} target="_blank" rel="noreferrer" className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded inline-flex" title="Download"><Download className="w-4 h-4" /></a> : <span className="text-xs text-slate-400">No PDF</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {data?.totalPages > 1 && (
                <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100">
                  <p className="text-sm text-slate-500">Page {page} of {data.totalPages} ({data.total} receipts)</p>
                  <div className="flex gap-2">
                    <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="btn-secondary text-sm py-1.5 px-3 disabled:opacity-50">Prev</button>
                    <button disabled={page >= data.totalPages} onClick={() => setPage(p => p + 1)} className="btn-secondary text-sm py-1.5 px-3 disabled:opacity-50">Next</button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Generate Receipt">
        <div className="space-y-4">
          <div><label className="label">Payment Record <span className="text-red-500">*</span></label>
            <select value={form.paymentId} onChange={(e) => set('paymentId')(e.target.value)} className="input" required>
              <option value="">Select payment...</option>
              {payments?.items?.map((p: any) => <option key={p._id} value={p._id}>{formatCurrency(p.amount)} — {p.paymentPurpose} ({formatDate(p.paymentDate)})</option>)}
            </select></div>
          <div><label className="label">Remarks</label>
            <textarea value={form.remarks} onChange={(e) => set('remarks')(e.target.value)} placeholder="Optional note on receipt..." className="input resize-none" rows={2} /></div>
          <div className="flex gap-3 pt-2">
            <button onClick={() => mutation.mutate(form)} disabled={mutation.isPending || !form.paymentId} className="btn-primary flex-1">{mutation.isPending ? 'Generating...' : 'Generate Receipt'}</button>
            <button onClick={() => setShowModal(false)} className="btn-secondary">Cancel</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
