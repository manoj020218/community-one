import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { BarChart3, Play, Download } from 'lucide-react';
import { api, extractData } from '../../services/api';
import { PageHeader } from '../../components/common/PageHeader';
import { EmptyState } from '../../components/common/EmptyState';
import { TableSkeleton } from '../../components/common/LoadingSkeleton';
import { useAuthStore } from '../../store/authStore';
import { useSocietyStore } from '../../store/societyStore';
import { cn } from '../../utils/cn';
import toast from 'react-hot-toast';

const FORMAT_ICONS: Record<string, string> = { JSON: 'badge-blue', CSV: 'badge-green', PDF: 'badge-red' };

export function ReportsPage() {
  const { user } = useAuthStore();
  const { currentSociety } = useSocietyStore();
  const societyId = currentSociety?._id || user?.societyId || '';
  const [selectedReport, setSelectedReport] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);

  const { data: reports = [], isLoading } = useQuery({
    queryKey: ['reports-catalog'],
    queryFn: () => extractData<any[]>(api.get('/reports')),
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
            <button
              onClick={() => { const blob = new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `${selectedReport}-${Date.now()}.json`; a.click(); }}
              className="btn-secondary text-sm flex items-center gap-2"
            >
              <Download className="w-4 h-4" /> Download JSON
            </button>
          </div>
          <pre className="bg-slate-50 text-slate-700 text-xs rounded-xl p-4 overflow-x-auto max-h-96">{JSON.stringify(result, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}
