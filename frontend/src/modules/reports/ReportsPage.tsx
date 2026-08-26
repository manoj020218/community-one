import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { BarChart3, Play, Download, FileSpreadsheet } from 'lucide-react';
import { api, extractData } from '../../services/api';
import { PageHeader } from '../../components/common/PageHeader';
import { EmptyState } from '../../components/common/EmptyState';
import { TableSkeleton } from '../../components/common/LoadingSkeleton';
import { useAuthStore } from '../../store/authStore';
import { useSocietyStore } from '../../store/societyStore';
import { cn } from '../../utils/cn';
import toast from 'react-hot-toast';

const FORMAT_ICONS: Record<string, string> = { JSON: 'badge-blue', CSV: 'badge-green', EXCEL: 'badge-green', PDF: 'badge-red', PRINT: 'badge-gray' };

// Flattens each row for a spreadsheet cell: a populated ref ({_id, flatNo}, {_id, name} or
// {_id, floorNumber}) becomes just its readable value, arrays join with "; ", everything
// else is left alone.
function readablePopulatedValue(v: Record<string, any>): string {
  // floorNumber can legitimately be 0 (Ground Floor) or negative (basements) — check
  // presence explicitly rather than falling through a truthy `||` chain, which would
  // treat 0 as "missing" and fall all the way to JSON.stringify.
  if (v.flatNo !== undefined) return v.flatNo;
  if (v.name !== undefined) return v.name;
  if (v.floorNumber !== undefined) return v.floorNumber;
  if (v.shortId !== undefined) return v.shortId;
  return JSON.stringify(v);
}

function flattenForCsv(row: Record<string, any>) {
  const flat: Record<string, any> = {};
  Object.entries(row).forEach(([key, value]) => {
    if (['_id', '__v', 'createdBy', 'updatedBy'].includes(key)) return;
    if (value === null || value === undefined) { flat[key] = ''; return; }
    if (Array.isArray(value)) {
      flat[key] = value.map((v) => (v && typeof v === 'object' ? readablePopulatedValue(v) : v)).join('; ');
    } else if (typeof value === 'object') {
      flat[key] = readablePopulatedValue(value);
    } else {
      flat[key] = value;
    }
  });
  return flat;
}

function rowsToCsv(rows: Record<string, any>[]): string {
  if (!rows.length) return '';
  const flatRows = rows.map(flattenForCsv);
  const headers = Object.keys(flatRows[0]);
  const escapeCell = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const lines = [headers.join(','), ...flatRows.map((r) => headers.map((h) => escapeCell(r[h])).join(','))];
  return '﻿' + lines.join('\r\n'); // BOM so Excel reads UTF-8 (names, ₹ etc.) correctly
}

function downloadCsv(rows: Record<string, any>[], filename: string) {
  const blob = new Blob([rowsToCsv(rows)], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function ReportsPage() {
  const { user } = useAuthStore();
  const { currentSociety } = useSocietyStore();
  const societyId = currentSociety?._id || user?.societyId || '';
  const [selectedReport, setSelectedReport] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);

  const { data: reports = [], isLoading } = useQuery({
    queryKey: ['reports-catalog'],
    queryFn: () => extractData<any[]>(api.get('/reports/definitions')),
  });

  const runMutation = useMutation({
    mutationFn: (code: string) => extractData<any>(api.get(`/reports/run/${code}?societyId=${societyId}`)),
    onSuccess: (data) => { setResult(data); toast.success('Report generated!'); },
    onError: () => toast.error('Failed to run report'),
  });

  const handleRun = (code: string) => { setSelectedReport(code); setResult(null); runMutation.mutate(code); };

  return (
    <div className="space-y-6">
      <PageHeader title="Reports" subtitle="Generate and export operational reports" />

      {isLoading ? <TableSkeleton rows={5} cols={3} /> : reports.length === 0 ? (
        <div className="card"><EmptyState icon={BarChart3} title="No reports available" description="Reports are seeded by the system administrator" /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {reports.map((report: any) => (
            <div key={report._id || report.code} className="card p-5 space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center flex-shrink-0"><BarChart3 className="w-4 h-4" /></div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-slate-800 text-sm">{report.name}</h3>
                  <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{report.description}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-1">
                {report.exportFormats?.map((f: string) => <span key={f} className={cn('badge text-xs', FORMAT_ICONS[f] || 'badge-gray')}>{f}</span>)}
              </div>
              <button
                onClick={() => handleRun(report.code)}
                disabled={runMutation.isPending && selectedReport === report.code}
                className="btn-primary w-full flex items-center justify-center gap-2 text-sm py-2"
              >
                <Play className="w-3.5 h-3.5" />
                {runMutation.isPending && selectedReport === report.code ? 'Running...' : 'Run Report'}
              </button>
            </div>
          ))}
        </div>
      )}

      {result && (
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-800">Report Results</h3>
            <div className="flex items-center gap-2">
              {Array.isArray(result) && result.length > 0 && (
                <button
                  onClick={() => downloadCsv(result, `${selectedReport}-${Date.now()}.csv`)}
                  className="btn-primary text-sm flex items-center gap-2"
                >
                  <FileSpreadsheet className="w-4 h-4" /> Download Excel
                </button>
              )}
              <button
                onClick={() => { const blob = new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `${selectedReport}-${Date.now()}.json`; a.click(); }}
                className="btn-secondary text-sm flex items-center gap-2"
              >
                <Download className="w-4 h-4" /> Download JSON
              </button>
            </div>
          </div>
          <pre className="bg-slate-50 text-slate-700 text-xs rounded-xl p-4 overflow-x-auto max-h-96">{JSON.stringify(result, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}
