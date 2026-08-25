import { useQuery } from '@tanstack/react-query';
import { Activity, TrendingUp } from 'lucide-react';
import { api, extractData } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { useSocietyStore } from '../../store/societyStore';
import { GuardHitMissSummary, PatrolRound } from './guardPatrol.types';

function timeSince(iso: string): string {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m ago`;
}

export function PatrolDashboardTab() {
  const { user } = useAuthStore();
  const { currentSociety } = useSocietyStore();
  const societyId = currentSociety?._id || user?.societyId || '';

  const { data: summary } = useQuery({
    queryKey: ['patrol-summary', societyId],
    queryFn: () => extractData<GuardHitMissSummary[]>(api.get('/guard-patrol/reports/summary', { params: { societyId } })),
    enabled: !!societyId,
    refetchInterval: 60000,
  });

  const { data: liveRounds } = useQuery({
    queryKey: ['patrol-live-rounds', societyId],
    queryFn: () => extractData<PatrolRound[]>(api.get('/guard-patrol/reports/live-rounds', { params: { societyId } })),
    enabled: !!societyId,
    refetchInterval: 20000,
  });

  return (
    <div className="space-y-6">
      <div className="card p-5">
        <div className="flex items-center gap-2 mb-4"><Activity className="w-4 h-4 text-slate-400" /><h3 className="font-semibold text-slate-800 text-sm">Rounds In Progress</h3></div>
        {!liveRounds?.length ? (
          <p className="text-sm text-slate-400">No guard is on a round right now.</p>
        ) : (
          <div className="space-y-2">
            {liveRounds.map((r) => (
              <div key={r._id} className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-100">
                <div>
                  <p className="text-sm font-medium text-slate-800">{typeof r.guardUserId === 'object' ? r.guardUserId.name : r.guardUserId}</p>
                  <p className="text-xs text-slate-500">{typeof r.routeId === 'object' ? r.routeId.name : r.routeId}</p>
                </div>
                <span className="text-xs text-slate-400">started {timeSince(r.startedAt)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card p-5">
        <div className="flex items-center gap-2 mb-4"><TrendingUp className="w-4 h-4 text-slate-400" /><h3 className="font-semibold text-slate-800 text-sm">Hit/Miss Ratio This Month</h3></div>
        {!summary?.length ? (
          <p className="text-sm text-slate-400">No completed rounds yet this month.</p>
        ) : (
          <div className="space-y-3">
            {summary.map((g) => (
              <div key={g.guardUserId}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="font-medium text-slate-700">{g.guardName}</span>
                  <span className="text-slate-500">{g.hit}/{g.totalExpected} hit · {g.late} late · {g.missed} missed · {g.hitRatePercent}%</span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${g.hitRatePercent >= 80 ? 'bg-emerald-500' : g.hitRatePercent >= 50 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${g.hitRatePercent}%` }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
