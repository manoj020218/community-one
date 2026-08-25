import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { FileBarChart, Download } from 'lucide-react';
import toast from 'react-hot-toast';
import { api, extractData } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { useSocietyStore } from '../../store/societyStore';
import { downloadCsv } from '../sama/sama.types';

export function PatrolReportsTab() {
  const { user } = useAuthStore();
  const { currentSociety } = useSocietyStore();
  const societyId = currentSociety?._id || user?.societyId || '';
  const now = new Date();
  const [month, setMonth] = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);

  const exportMutation = useMutation({
    mutationFn: () => {
      const [year, m] = month.split('-').map(Number);
      return extractData<{ fileName: string; content: string }>(api.get('/guard-patrol/reports/monthly-export', { params: { societyId, year, month: m } }));
    },
    onSuccess: (data) => {
      downloadCsv(data.fileName, data.content);
      toast.success('Report downloaded');
    },
    onError: () => toast.error('Failed to generate report'),
  });

  return (
    <div className="card p-5 space-y-4">
      <div className="flex items-center gap-2"><FileBarChart className="w-4 h-4 text-slate-400" /><h3 className="font-semibold text-slate-800 text-sm">Monthly Hit/Miss Report</h3></div>
      <p className="text-sm text-slate-500">Per-guard checkpoint Hit/Late/Missed counts and Hit Rate for the selected month, as a downloadable CSV.</p>
      <div className="flex items-center gap-3">
        <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="input w-auto" />
        <button onClick={() => exportMutation.mutate()} disabled={exportMutation.isPending} className="btn-primary flex items-center gap-2">
          <Download className="w-4 h-4" /> {exportMutation.isPending ? 'Generating...' : 'Download CSV'}
        </button>
      </div>
    </div>
  );
}
