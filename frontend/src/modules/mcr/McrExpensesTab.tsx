import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Wallet, Search, Ban, Upload, ExternalLink } from 'lucide-react';
import toast from 'react-hot-toast';
import { api, extractData } from '../../services/api';
import { Modal } from '../../components/common/Modal';
import { EmptyState } from '../../components/common/EmptyState';
import { TableSkeleton } from '../../components/common/LoadingSkeleton';
import { SortableTh } from '../../components/common/SortableTh';
import { useAuthStore } from '../../store/authStore';
import { useSocietyStore } from '../../store/societyStore';
import { cn, formatDate } from '../../utils/cn';
import { EXPENSE_CATEGORIES, EXPENSE_PAYMENT_MODES, EXPENSE_STATUSES, EXPENSE_STATUS_BADGE, Expense, formatPaise, McrOpeningBalance } from './mcr.types';
import { OpeningBalanceEmptyState, OpeningBalanceWizard } from './OpeningBalanceWizard';

const BLANK_FORM = {
  category: 'OTHER' as string, amountPaise: '', paymentMode: 'CASH' as string,
  paidTo: '', expenseDate: new Date().toISOString().slice(0, 10), description: '',
};

export function McrExpensesTab() {
  const { user } = useAuthStore();
  const { currentSociety } = useSocietyStore();
  const societyId = currentSociety?._id || user?.societyId || '';
  const queryClient = useQueryClient();

  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('RECORDED');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('expenseDate');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [showModal, setShowModal] = useState(false);
  const [showWizard, setShowWizard] = useState(false);
  const [form, setForm] = useState(BLANK_FORM);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [cancelTarget, setCancelTarget] = useState<Expense | null>(null);
  const [cancelReason, setCancelReason] = useState('');

  const { data: opening, isLoading: openingLoading } = useQuery({
    queryKey: ['mcr-opening-balance', societyId],
    queryFn: () => extractData<McrOpeningBalance | null>(api.get('/mcr/opening-balance', { params: { societyId } })),
    enabled: !!societyId,
  });

  const { data: rawData, isLoading } = useQuery({
    queryKey: ['mcr-expenses', societyId, categoryFilter, statusFilter, search],
    queryFn: () => extractData<Expense[]>(api.get('/mcr/expenses', {
      params: { societyId, ...(categoryFilter ? { category: categoryFilter } : {}), ...(statusFilter ? { status: statusFilter } : {}), ...(search ? { search } : {}) },
    })),
    enabled: !!societyId && !!opening,
  });

  const toggleSort = (field: string) => {
    if (sortBy === field) { setSortDir((d) => (d === 'asc' ? 'desc' : 'asc')); return; }
    setSortBy(field);
    setSortDir('asc');
  };

  const sortValue = (e: Expense): string | number => {
    switch (sortBy) {
      case 'paidTo': return e.paidTo.toLowerCase();
      case 'amountPaise': return e.amountPaise;
      case 'category': return e.category;
      case 'expenseDate': default: return new Date(e.expenseDate).getTime();
    }
  };

  const data = rawData ? [...rawData].sort((a, b) => {
    const av = sortValue(a);
    const bv = sortValue(b);
    const cmp = av < bv ? -1 : av > bv ? 1 : 0;
    return sortDir === 'asc' ? cmp : -cmp;
  }) : rawData;

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['mcr-expenses'] });
    queryClient.invalidateQueries({ queryKey: ['mcr-fund-balance'] });
  };

  const recordMutation = useMutation({
    mutationFn: async () => {
      let proofFileIds: string[] = [];
      if (proofFile) {
        const fd = new FormData();
        fd.append('file', proofFile);
        fd.append('societyId', societyId);
        fd.append('moduleCode', 'MCR');
        fd.append('entityType', 'MCR_EXPENSE_PROOF');
        const uploaded = await extractData<{ _id: string }>(api.post('/files/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } }));
        proofFileIds = [uploaded._id];
      }
      return api.post('/mcr/expenses', {
        societyId,
        category: form.category,
        amountPaise: Math.round(Number(form.amountPaise || 0) * 100),
        paymentMode: form.paymentMode,
        paidTo: form.paidTo,
        expenseDate: form.expenseDate,
        description: form.description || undefined,
        proofFileIds,
      });
    },
    onSuccess: () => { invalidate(); setShowModal(false); setForm(BLANK_FORM); setProofFile(null); toast.success('Expense recorded'); },
  });

  const cancelMutation = useMutation({
    mutationFn: () => api.post(`/mcr/expenses/${cancelTarget!._id}/cancel`, { societyId, reason: cancelReason }),
    onSuccess: () => { invalidate(); setCancelTarget(null); setCancelReason(''); toast.success('Expense cancelled'); },
  });

  const set = (k: keyof typeof BLANK_FORM) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  if (openingLoading) return <TableSkeleton rows={4} cols={5} />;

  if (!opening) {
    return (
      <>
        <OpeningBalanceEmptyState onSetup={() => setShowWizard(true)} />
        <OpeningBalanceWizard isOpen={showWizard} onClose={() => setShowWizard(false)} />
      </>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input placeholder="Search paid-to, description..." value={search} onChange={(e) => setSearch(e.target.value)} className="input pl-10 w-64" />
          </div>
          <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="input w-auto">
            <option value="">All categories</option>
            {EXPENSE_CATEGORIES.map((c) => <option key={c} value={c}>{c.replace('_', ' ')}</option>)}
          </select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="input w-auto">
            <option value="">All statuses</option>
            {EXPENSE_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2 text-sm">
          <Plus className="w-4 h-4" /> Record Expense
        </button>
      </div>

      {isLoading ? <TableSkeleton rows={5} cols={6} /> : !data?.length ? (
        <EmptyState icon={Wallet} title="No expenses recorded" description="Record society expenditure (salaries, electricity, repairs, etc.) to track fund balance."
          action={<button onClick={() => setShowModal(true)} className="btn-primary">Record Expense</button>} />
      ) : (
        <div className="card overflow-hidden overflow-x-auto">
          <table className="w-full">
            <thead><tr>
              <th className="table-header text-left">Expense #</th>
              <SortableTh label="Paid To" field="paidTo" sortBy={sortBy} sortDir={sortDir} onSort={toggleSort} />
              <SortableTh label="Category" field="category" sortBy={sortBy} sortDir={sortDir} onSort={toggleSort} />
              <SortableTh label="Amount" field="amountPaise" sortBy={sortBy} sortDir={sortDir} onSort={toggleSort} />
              <th className="table-header text-left">Mode</th>
              <SortableTh label="Date" field="expenseDate" sortBy={sortBy} sortDir={sortDir} onSort={toggleSort} />
              <th className="table-header text-left">Proof</th>
              <th className="table-header text-left">Status</th>
              <th className="table-header text-left">Actions</th>
            </tr></thead>
            <tbody>
              {data.map((expense) => (
                <tr key={expense._id} className="table-row">
                  <td className="table-cell font-mono text-xs">{expense.expenseNumber}</td>
                  <td className="table-cell text-sm text-slate-700">{expense.paidTo}</td>
                  <td className="table-cell"><span className="badge badge-gray text-xs">{expense.category.replace('_', ' ')}</span></td>
                  <td className="table-cell font-semibold">{formatPaise(expense.amountPaise)}</td>
                  <td className="table-cell text-xs text-slate-500">{expense.paymentMode}</td>
                  <td className="table-cell text-xs text-slate-500">{formatDate(expense.expenseDate)}</td>
                  <td className="table-cell">
                    {expense.proofFileIds?.length ? (
                      <div className="flex flex-col gap-1">
                        {expense.proofFileIds.map((f, i) => {
                          const url = typeof f === 'string' ? undefined : f.url;
                          return url ? (
                            <a key={i} href={url} target="_blank" rel="noreferrer" className="text-primary-600 hover:text-primary-700 flex items-center gap-1 text-xs">
                              <ExternalLink className="w-3 h-3" /> View
                            </a>
                          ) : null;
                        })}
                      </div>
                    ) : <span className="text-xs text-slate-400">—</span>}
                  </td>
                  <td className="table-cell"><span className={cn('badge', EXPENSE_STATUS_BADGE[expense.status])}>{expense.status}</span></td>
                  <td className="table-cell">
                    {expense.status === 'RECORDED' && (
                      <button onClick={() => setCancelTarget(expense)} className="text-red-600 hover:text-red-700" title="Cancel">
                        <Ban className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Record Expense">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div><label className="label">Category <span className="text-red-500">*</span></label>
              <select value={form.category} onChange={(e) => set('category')(e.target.value)} className="input">
                {EXPENSE_CATEGORIES.map((c) => <option key={c} value={c}>{c.replace('_', ' ')}</option>)}
              </select></div>
            <div><label className="label">Amount (₹) <span className="text-red-500">*</span></label>
              <input type="number" min={0} value={form.amountPaise} onChange={(e) => set('amountPaise')(e.target.value)} className="input" /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="label">Paid To <span className="text-red-500">*</span></label>
              <input value={form.paidTo} onChange={(e) => set('paidTo')(e.target.value)} className="input" placeholder="Vendor / person name" /></div>
            <div><label className="label">Payment Mode</label>
              <select value={form.paymentMode} onChange={(e) => set('paymentMode')(e.target.value)} className="input">
                {EXPENSE_PAYMENT_MODES.map((m) => <option key={m} value={m}>{m}</option>)}
              </select></div>
          </div>
          <div><label className="label">Expense Date</label>
            <input type="date" value={form.expenseDate} onChange={(e) => set('expenseDate')(e.target.value)} className="input" /></div>
          <div><label className="label">Description</label>
            <textarea value={form.description} onChange={(e) => set('description')(e.target.value)} className="input resize-none" rows={2} /></div>
          <div>
            <label className="label">Proof <span className="text-slate-400 font-normal">(optional)</span></label>
            <label className="flex items-center gap-2 justify-center border-2 border-dashed border-slate-200 rounded-xl p-4 cursor-pointer hover:bg-slate-50 text-sm text-slate-500">
              <Upload className="w-4 h-4" />
              {proofFile ? proofFile.name : 'Choose receipt/voucher to upload'}
              <input type="file" accept="image/*,.pdf" className="hidden" onChange={(e) => setProofFile(e.target.files?.[0] || null)} />
            </label>
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={() => recordMutation.mutate()} disabled={recordMutation.isPending || !form.paidTo || !form.amountPaise} className="btn-primary flex-1">
              {recordMutation.isPending ? 'Recording...' : 'Record Expense'}
            </button>
            <button onClick={() => setShowModal(false)} className="btn-secondary">Cancel</button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={!!cancelTarget} onClose={() => { setCancelTarget(null); setCancelReason(''); }} title={`Cancel Expense ${cancelTarget?.expenseNumber || ''}`}>
        <div className="space-y-4">
          <p className="text-sm text-slate-600">This marks the expense as cancelled so it drops out of Fund Balance — the record stays for audit, it's not deleted.</p>
          <div><label className="label">Reason <span className="text-red-500">*</span></label>
            <textarea value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} className="input resize-none" rows={3} placeholder="Required — minimum 3 characters" /></div>
          <div className="flex gap-3 pt-2">
            <button onClick={() => cancelMutation.mutate()} disabled={cancelMutation.isPending || cancelReason.trim().length < 3} className="btn-danger flex-1">
              {cancelMutation.isPending ? 'Cancelling...' : 'Confirm Cancel'}
            </button>
            <button onClick={() => { setCancelTarget(null); setCancelReason(''); }} className="btn-secondary">Back</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
