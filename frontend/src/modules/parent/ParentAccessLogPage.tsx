import { useQuery } from '@tanstack/react-query';
import { ShieldCheck, MapPin, Clock } from 'lucide-react';
import { api, extractData } from '../../services/api';

interface WardAccessLogEntry {
  residentId: string;
  residentName: string;
  deviceName: string;
  gateName?: string;
  method: string;
  timestamp: string;
}

export function ParentAccessLogPage() {
  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['parent-access-logs'],
    queryFn: () => extractData<WardAccessLogEntry[]>(api.get('/devices/access-logs/my-wards?limit=100')),
  });

  return (
    <div className="space-y-4 animate-fade-in">
      <div>
        <h1 className="page-title">Access Logs</h1>
        <p className="page-subtitle">When your ward was seen at a gate/access point</p>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => <div key={i} className="skeleton h-16 rounded-2xl" />)}
        </div>
      ) : logs.length === 0 ? (
        <div className="card p-8 text-center text-slate-500 text-sm">
          No access events yet.
        </div>
      ) : (
        <div className="space-y-2">
          {logs.map((entry, idx) => (
            <div key={idx} className="card p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-slate-800">{entry.residentName}</p>
                <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5">
                  <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {entry.gateName || entry.deviceName}</span>
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {new Date(entry.timestamp).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
