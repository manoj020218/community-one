import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, extractData } from '../../services/api';
import { PageHeader } from '../../components/common/PageHeader';
import { StatCard } from '../../components/common/StatCard';
import { PaginatedResult } from '../../types';
import { ClipboardList, Clock, Search, Settings2, ShieldCheck, TimerReset, UserCheck } from 'lucide-react';
import { formatDateTime } from '../../utils/cn';
import { useAuthStore } from '../../store/authStore';
import { hasPermission } from '../../utils/permissions';
import { VisitorRequest, VisitorSettings, VisitorSummary } from './types';
import { withSocietyQuery } from './visitorApi';

export function AdminVisitorView(props: { societyId: string; transport: string; pollingMs: number }) {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const { data: summary } = useQuery({
    queryKey: ['visitor-summary', props.societyId, props.transport],
    queryFn: () => extractData<VisitorSummary>(api.get(withSocietyQuery('/visitor/reports/summary', props.societyId))),
    refetchInterval: props.transport === 'polling' ? props.pollingMs : false,
  });
  const { data: requests } = useQuery({
    queryKey: ['visitor-admin-requests', props.societyId, statusFilter, search, props.transport],
    queryFn: () => extractData<PaginatedResult<VisitorRequest>>(api.get(withSocietyQuery(`/visitor/requests?limit=20${statusFilter ? `&status=${statusFilter}` : ''}${search ? `&search=${encodeURIComponent(search)}` : ''}`, props.societyId))),
    refetchInterval: props.transport === 'polling' ? props.pollingMs : false,
  });
  const { data: settings } = useQuery({
    queryKey: ['visitor-settings-admin', props.societyId],
    queryFn: () => extractData<VisitorSettings>(api.get(withSocietyQuery('/visitor/settings', props.societyId))),
  });
  const saveMutation = useMutation({
    mutationFn: (payload: Partial<VisitorSettings>) => api.patch('/visitor/settings', { ...payload, societyId: props.societyId }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['visitor-settings-admin'] }),
  });
  const statusCount = (key: string): number => {
    const value = summary?.[key];
    return typeof value === 'number' ? value : 0;
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Visitor Monitoring"
        subtitle="Live society-wide visitor activity, operational controls, and module settings."
        action={hasPermission(user, 'visitor.audit.view') ? (
          <Link to="/audit?moduleCode=VISITOR" className="btn-secondary gap-2 text-sm">
            <ClipboardList className="h-4 w-4" /> View Audit Log
          </Link>
        ) : undefined}
      />
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard title="Pending" value={statusCount('PENDING_APPROVAL')} icon={TimerReset} color="amber" />
        <StatCard title="Approved" value={statusCount('APPROVED')} icon={UserCheck} color="green" />
        <StatCard title="Rejected" value={statusCount('REJECTED')} icon={ShieldCheck} color="red" />
        <StatCard title="Inside" value={statusCount('CURRENTLY_INSIDE')} icon={Settings2} color="blue" />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <StatCard title="Today" value={statusCount('TODAY_COUNT')} icon={Clock} color="amber" />
        <StatCard title="Avg. Approval Time (min)" value={statusCount('AVG_APPROVAL_MINUTES')} icon={TimerReset} color="green" />
      </div>
      <div className="grid gap-4 xl:grid-cols-[1.2fr,0.8fr]">
        <div className="card p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-semibold text-slate-800">Recent Requests</p>
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name or mobile" className="input w-auto min-w-48 pl-9" />
              </div>
              <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="input w-auto min-w-48"><option value="">All statuses</option><option value="PENDING_APPROVAL">Pending</option><option value="APPROVED">Approved</option><option value="REJECTED">Rejected</option><option value="ENTRY_CONFIRMED">Inside</option></select>
            </div>
          </div>
          <div className="space-y-3">{(requests?.items || []).map((request) => <div key={request._id} className="rounded-2xl border border-slate-100 p-4"><div className="flex items-center justify-between gap-3"><p className="font-medium text-slate-800">{request.visitorName}</p><span className="text-xs font-semibold text-slate-500">{request.status.replace(/_/g, ' ')}</span></div><p className="mt-1 text-sm text-slate-500">{typeof request.flatId === 'string' ? request.flatId : request.flatId.flatNo} · {typeof request.gateId === 'string' ? request.gateId : request.gateId.name}</p><p className="mt-1 text-xs text-slate-400">{formatDateTime(request.createdAt)}</p></div>)}</div>
        </div>
        <div className="space-y-4">
          <div className="card p-5">
            <p className="text-sm font-semibold text-slate-800">Gate-wise Activity</p>
            <div className="mt-4 space-y-2">
              {(summary?.BY_GATE || []).map((gate) => (
                <div key={gate.gateId} className="flex items-center justify-between text-sm text-slate-600">
                  <span>{gate.gateName}</span>
                  <span className="font-semibold text-slate-800">{gate.count}</span>
                </div>
              ))}
              {!summary?.BY_GATE?.length && <p className="text-sm text-slate-500">No gate activity yet.</p>}
            </div>
          </div>
          <div className="card p-5">
            <p className="text-sm font-semibold text-slate-800">Visitor Settings</p>
            {settings ? <div className="mt-4 space-y-4"><label className="flex items-center justify-between text-sm text-slate-600"><span>Require photo</span><input type="checkbox" checked={settings.requireVisitorPhoto} onChange={(event) => saveMutation.mutate({ requireVisitorPhoto: event.target.checked })} /></label><label className="flex items-center justify-between text-sm text-slate-600"><span>Require purpose</span><input type="checkbox" checked={settings.requirePurpose} onChange={(event) => saveMutation.mutate({ requirePurpose: event.target.checked })} /></label><label className="flex items-center justify-between text-sm text-slate-600"><span>Guard cancellation</span><input type="checkbox" checked={settings.allowGuardCancellation} onChange={(event) => saveMutation.mutate({ allowGuardCancellation: event.target.checked })} /></label><label className="flex items-center justify-between text-sm text-slate-600"><span>Exit confirmation</span><input type="checkbox" checked={settings.exitConfirmationEnabled} onChange={(event) => saveMutation.mutate({ exitConfirmationEnabled: event.target.checked })} /></label><label className="block text-sm text-slate-600"><span className="mb-2 block">Approval expiry (minutes)</span><input type="number" defaultValue={settings.defaultApprovalExpiryMinutes} className="input" onBlur={(event) => saveMutation.mutate({ defaultApprovalExpiryMinutes: Number(event.target.value) })} /></label></div> : null}
          </div>
        </div>
      </div>
    </div>
  );
}
