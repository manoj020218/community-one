import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Download, FileBarChart, Search } from 'lucide-react';
import { api, extractData } from '../../services/api';
import { EmptyState } from '../../components/common/EmptyState';
import { TableSkeleton } from '../../components/common/LoadingSkeleton';
import { StatCard } from '../../components/common/StatCard';
import { useAuthStore } from '../../store/authStore';
import { useSocietyStore } from '../../store/societyStore';
import { formatDate } from '../../utils/cn';
import { formatPaise, McrIncomeExpenditureStatement, McrPaymentRecord, McrStatement } from './mcr.types';
import { hasMcrExpenseAccess } from './mcr.permissions';

const monthStart = () => new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);
const today = () => new Date().toISOString().slice(0, 10);

function exportCsv(fileName: string, rows: Record<string, string | number>[]) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const csv = [headers.join(','), ...rows.map((row) => headers.map((h) => `"${String(row[h] ?? '').replace(/"/g, '""')}"`).join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function McrReportsTab() {
  const { user } = useAuthStore();
  const { currentSociety } = useSocietyStore();
  const societyId = currentSociety?._id || user?.societyId || '';

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [statementFlatId, setStatementFlatId] = useState('');
  const [ieStartDate, setIeStartDate] = useState(monthStart());
  const [ieEndDate, setIeEndDate] = useState(today());
  const canSeeFundBalance = hasMcrExpenseAccess(user?.permissions || []);

  const { data: incomeExpenditure, isLoading: loadingIE } = useQuery({
    queryKey: ['mcr-income-expenditure', societyId, ieStartDate, ieEndDate],
    queryFn: () => extractData<McrIncomeExpenditureStatement>(api.get('/mcr/reports/income-expenditure', { params: { societyId, startDate: ieStartDate, endDate: ieEndDate } })),
    enabled: !!societyId && canSeeFundBalance && !!ieStartDate && !!ieEndDate,
  });

  const { data: flats } = useQuery({
    queryKey: ['flats-list', societyId],
    queryFn: () => extractData<any>(api.get(`/flats/society/${societyId}?limit=200`)),
    enabled: !!societyId,
  });

  const { data: collections, isLoading: loadingCollections } = useQuery({
    queryKey: ['mcr-collections', societyId, startDate, endDate],
    queryFn: () => extractData<McrPaymentRecord[]>(api.get('/mcr/reports/collections', { params: { societyId, ...(startDate ? { startDate } : {}), ...(endDate ? { endDate } : {}) } })),
    enabled: !!societyId,
  });

  const { data: statement, isLoading: loadingStatement } = useQuery({
    queryKey: ['mcr-statement', societyId, statementFlatId],
    queryFn: () => extractData<McrStatement>(api.get('/mcr/reports/statement', { params: { societyId, flatId: statementFlatId } })),
    enabled: !!societyId && !!statementFlatId,
  });

  return (
    <div className="space-y-6">
      <div className="card p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h3 className="section-title">Collections Register</h3>
          <div className="flex flex-wrap items-center gap-2">
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="input w-auto" />
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="input w-auto" />
            <button
              onClick={() => exportCsv('mcr-collections.csv', (collections || []).map((p) => ({
                paymentNumber: p.paymentNumber, payerName: p.payerName, amount: (p.amountPaise / 100).toFixed(2),
                method: p.paymentMethod, date: formatDate(p.paymentDate), status: p.status,
              })))}
              disabled={!collections?.length}
              className="btn-secondary flex items-center gap-2 text-sm"
            >
              <Download className="w-4 h-4" /> Export CSV
            </button>
          </div>
        </div>
        {loadingCollections ? <TableSkeleton rows={4} cols={5} /> : !collections?.length ? (
          <EmptyState icon={FileBarChart} title="No verified collections in range" description="Verified payments will appear here once recorded." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr>
                <th className="table-header text-left">Payment #</th>
                <th className="table-header text-left">Payer</th>
                <th className="table-header text-left">Amount</th>
                <th className="table-header text-left">Method</th>
                <th className="table-header text-left">Date</th>
              </tr></thead>
              <tbody>
                {collections.map((p) => (
                  <tr key={p._id} className="table-row">
                    <td className="table-cell font-mono text-xs">{p.paymentNumber}</td>
                    <td className="table-cell text-sm">{p.payerName}</td>
                    <td className="table-cell font-semibold">{formatPaise(p.amountPaise)}</td>
                    <td className="table-cell text-xs text-slate-500">{p.paymentMethod.replace('_', ' ')}</td>
                    <td className="table-cell text-xs text-slate-500">{formatDate(p.paymentDate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {canSeeFundBalance && (
        <div className="card p-6">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <h3 className="section-title">Income & Expenditure Statement</h3>
            <div className="flex flex-wrap items-center gap-2">
              <input type="date" value={ieStartDate} onChange={(e) => setIeStartDate(e.target.value)} className="input w-auto" />
              <input type="date" value={ieEndDate} onChange={(e) => setIeEndDate(e.target.value)} className="input w-auto" />
            </div>
          </div>
          {loadingIE ? <TableSkeleton rows={3} cols={2} /> : incomeExpenditure && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <StatCard title="Opening Balance" value={formatPaise(incomeExpenditure.periodOpeningBalancePaise)} icon={FileBarChart} color="blue" />
                <StatCard title="Income" value={formatPaise(incomeExpenditure.totalIncomePaise)} icon={FileBarChart} color="green" />
                <StatCard title="Expenses" value={formatPaise(incomeExpenditure.totalExpensePaise)} icon={FileBarChart} color="red" />
                <StatCard title="Closing Balance" value={formatPaise(incomeExpenditure.closingBalancePaise)} icon={FileBarChart} color="indigo" />
              </div>
              {!incomeExpenditure.expensesByCategory.length ? (
                <EmptyState icon={FileBarChart} title="No expenses in this period" description="Expenses recorded in the Expenses tab within this date range will appear here by category." />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead><tr>
                      <th className="table-header text-left">Category</th>
                      <th className="table-header text-left">Count</th>
                      <th className="table-header text-left">Total</th>
                    </tr></thead>
                    <tbody>
                      {incomeExpenditure.expensesByCategory.map((row) => (
                        <tr key={row.category} className="table-row">
                          <td className="table-cell text-sm">{row.category.replace('_', ' ')}</td>
                          <td className="table-cell text-xs text-slate-500">{row.count}</td>
                          <td className="table-cell font-semibold">{formatPaise(row.totalPaise)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <div className="card p-6">
        <h3 className="section-title mb-4">Flat Statement</h3>
        <div className="flex items-center gap-2 mb-4">
          <Search className="w-4 h-4 text-slate-400" />
          <select value={statementFlatId} onChange={(e) => setStatementFlatId(e.target.value)} className="input">
            <option value="">Select flat...</option>
            {flats?.items?.map((f: any) => <option key={f._id} value={f._id}>{f.towerId?.name ? `${f.towerId.name} - ${f.flatNo}` : f.flatNo}</option>)}
          </select>
        </div>

        {loadingStatement ? <TableSkeleton rows={3} cols={4} /> : statement && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <StatCard title="Billed" value={formatPaise(statement.summary.totalDemandPaise)} icon={FileBarChart} color="indigo" />
              <StatCard title="Paid" value={formatPaise(statement.summary.paidPaise)} icon={FileBarChart} color="green" />
              <StatCard title="Outstanding" value={formatPaise(statement.summary.outstandingPaise)} icon={FileBarChart} color="amber" />
              <StatCard title="Advance Balance" value={formatPaise(statement.summary.advanceBalancePaise)} icon={FileBarChart} color="blue" />
            </div>
            <div className="flex justify-end">
              <button
                onClick={() => exportCsv(`statement-${statementFlatId}.csv`, statement.ledger.map((l) => ({
                  date: formatDate(l.entryDate), type: l.entryType, description: l.description || '',
                  debit: (l.debitPaise / 100).toFixed(2), credit: (l.creditPaise / 100).toFixed(2), balance: (l.runningBalancePaise / 100).toFixed(2),
                })))}
                disabled={!statement.ledger.length}
                className="btn-secondary flex items-center gap-2 text-sm"
              >
                <Download className="w-4 h-4" /> Export Ledger CSV
              </button>
            </div>
            {!statement.ledger.length ? (
              <EmptyState icon={FileBarChart} title="No ledger entries" description="Ledger entries appear once demands are published or payments verified." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead><tr>
                    <th className="table-header text-left">Date</th>
                    <th className="table-header text-left">Type</th>
                    <th className="table-header text-left">Debit</th>
                    <th className="table-header text-left">Credit</th>
                    <th className="table-header text-left">Balance</th>
                  </tr></thead>
                  <tbody>
                    {statement.ledger.map((l, i) => (
                      <tr key={i} className="table-row">
                        <td className="table-cell text-xs text-slate-500">{formatDate(l.entryDate)}</td>
                        <td className="table-cell text-xs">{l.entryType.replace('_', ' ')}</td>
                        <td className="table-cell">{l.debitPaise ? formatPaise(l.debitPaise) : '—'}</td>
                        <td className="table-cell">{l.creditPaise ? formatPaise(l.creditPaise) : '—'}</td>
                        <td className="table-cell font-semibold">{formatPaise(l.runningBalancePaise)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
