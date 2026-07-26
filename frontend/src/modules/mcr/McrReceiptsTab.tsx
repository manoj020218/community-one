import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Eye, Download, Image as ImageIcon, Share2, Ban, Send } from 'lucide-react';
import toast from 'react-hot-toast';
import { api, extractData } from '../../services/api';
import { Modal } from '../../components/common/Modal';
import { EmptyState } from '../../components/common/EmptyState';
import { TableSkeleton } from '../../components/common/LoadingSkeleton';
import { useAuthStore } from '../../store/authStore';
import { useSocietyStore } from '../../store/societyStore';
import { cn, formatDate } from '../../utils/cn';
import { downloadMcrDocument, formatPaise, McrReceipt, MCR_NOTIFICATION_CHANNELS, MCR_RECEIPT_STATUSES, openMcrDocument, RECEIPT_STATUS_BADGE } from './mcr.types';

export function McrReceiptsTab() {
  const { user } = useAuthStore();
  const { currentSociety } = useSocietyStore();
  const societyId = currentSociety?._id || user?.societyId || '';
  const queryClient = useQueryClient();

  const [statusFilter, setStatusFilter] = useState('');
  const [reasonPrompt, setReasonPrompt] = useState<{ receiptId: string; action: 'void' | 'replace' } | null>(null);
  const [reason, setReason] = useState('');
  const [sendPrompt, setSendPrompt] = useState<string | null>(null);
  const [channels, setChannels] = useState<string[]>(['IN_APP']);

  const { data, isLoading } = useQuery({
    queryKey: ['mcr-receipts', societyId, statusFilter],
    queryFn: () => extractData<McrReceipt[]>(api.get('/mcr/receipts', { params: { societyId, ...(statusFilter ? { status: statusFilter } : {}) } })),
    enabled: !!societyId,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['mcr-receipts'] });

  const reasonMutation = useMutation({
    mutationFn: () => {
      if (!reasonPrompt) throw new Error('No receipt selected');
      return api.post(`/mcr/receipts/${reasonPrompt.receiptId}/${reasonPrompt.action}`, { societyId, reason });
    },
    onSuccess: () => { invalidate(); setReasonPrompt(null); setReason(''); toast.success('Receipt updated'); },
  });

  const sendMutation = useMutation({
    mutationFn: () => api.post(`/mcr/receipts/${sendPrompt}/send`, { societyId, channels }),
    onSuccess: () => { setSendPrompt(null); toast.success('Receipt dispatch queued'); },
  });

  const shareMutation = useMutation({
    mutationFn: (receiptId: string) => extractData<{ verifyUrl?: string; documentUrl?: string }>(api.get(`/mcr/receipts/${receiptId}/share`, { params: { societyId } })),
    onSuccess: (links) => {
      const url = links.verifyUrl || links.documentUrl || '';
      if (url) { navigator.clipboard.writeText(url); toast.success('Share link copied to clipboard'); }
    },
  });

  const toggleChannel = (c: string) => setChannels((cur) => (cur.includes(c) ? cur.filter((x) => x !== c) : [...cur, c]));

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="input w-auto">
          <option value="">All statuses</option>
          {MCR_RECEIPT_STATUSES.map((s) => <option key={s}>{s}</option>)}
        </select>
      </div>

      {isLoading ? <TableSkeleton rows={5} cols={5} /> : !data?.length ? (
        <EmptyState icon={ImageIcon} title="No receipts yet" description="Receipts are issued automatically once a manual payment is verified." />
      ) : (
        <div className="card overflow-hidden overflow-x-auto">
          <table className="w-full">
            <thead><tr>
              <th className="table-header text-left">Receipt #</th>
              <th className="table-header text-left">Flat</th>
              <th className="table-header text-left">Amount</th>
              <th className="table-header text-left">Issued</th>
              <th className="table-header text-left">Status</th>
              <th className="table-header text-left">Actions</th>
            </tr></thead>
            <tbody>
              {data.map((receipt) => (
                <tr key={receipt._id} className="table-row">
                  <td className="table-cell font-mono text-xs">{receipt.receiptNumber}</td>
                  <td className="table-cell text-xs text-slate-600">{typeof receipt.flatId === 'object' ? receipt.flatId.flatNo : receipt.flatId}</td>
                  <td className="table-cell font-semibold">{formatPaise(receipt.amountPaise)}</td>
                  <td className="table-cell text-xs text-slate-500">{formatDate(receipt.issuedAt)}</td>
                  <td className="table-cell"><span className={cn('badge', RECEIPT_STATUS_BADGE[receipt.status])}>{receipt.status}</span></td>
                  <td className="table-cell">
                    <div className="flex gap-2 flex-wrap">
                      <button onClick={() => openMcrDocument(api, `/mcr/receipts/${receipt._id}/document?societyId=${societyId}`)} className="text-slate-500 hover:text-slate-700" title="View">
                        <Eye className="w-4 h-4" />
                      </button>
                      <button onClick={() => downloadMcrDocument(api, `/mcr/receipts/${receipt._id}/download?societyId=${societyId}`, `${receipt.receiptNumber}.html`)} className="text-slate-500 hover:text-slate-700" title="Download">
                        <Download className="w-4 h-4" />
                      </button>
                      <button onClick={() => openMcrDocument(api, `/mcr/receipts/${receipt._id}/poster?societyId=${societyId}`)} className="text-slate-500 hover:text-slate-700" title="Poster">
                        <ImageIcon className="w-4 h-4" />
                      </button>
                      <button onClick={() => shareMutation.mutate(receipt._id)} className="text-slate-500 hover:text-slate-700" title="Copy share link">
                        <Share2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => setSendPrompt(receipt._id)} className="text-primary-600 hover:text-primary-700" title="Send">
                        <Send className="w-4 h-4" />
                      </button>
                      {receipt.status === 'ISSUED' && (
                        <button onClick={() => setReasonPrompt({ receiptId: receipt._id, action: 'void' })} className="text-red-600 hover:text-red-700" title="Void">
                          <Ban className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal isOpen={!!reasonPrompt} onClose={() => { setReasonPrompt(null); setReason(''); }} title={reasonPrompt?.action === 'void' ? 'Void Receipt' : 'Replace Receipt'}>
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

      <Modal isOpen={!!sendPrompt} onClose={() => setSendPrompt(null)} title="Send Receipt">
        <div className="space-y-4">
          <div className="space-y-2">
            {MCR_NOTIFICATION_CHANNELS.map((c) => (
              <label key={c} className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 cursor-pointer">
                <span className="text-sm font-medium text-slate-700">{c.replace('_', ' ')}</span>
                <input type="checkbox" checked={channels.includes(c)} onChange={() => toggleChannel(c)} className="w-5 h-5 text-indigo-600 rounded" />
              </label>
            ))}
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={() => sendMutation.mutate()} disabled={sendMutation.isPending || !channels.length} className="btn-primary flex-1 flex items-center justify-center gap-2">
              <Send className="w-4 h-4" /> {sendMutation.isPending ? 'Sending...' : 'Send'}
            </button>
            <button onClick={() => setSendPrompt(null)} className="btn-secondary">Cancel</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
