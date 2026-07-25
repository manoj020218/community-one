import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, DoorOpen, LogOut, Search, ShieldCheck, Wifi, WifiOff } from 'lucide-react';
import { api, extractData } from '../../services/api';
import { PageHeader } from '../../components/common/PageHeader';
import { EmptyState } from '../../components/common/EmptyState';
import { PaginatedResult, Tower } from '../../types';
import { cn, formatDateTime } from '../../utils/cn';
import { VisitorRequestModal } from './VisitorRequestModal';
import { VisitorFlatTile, VisitorGate, VisitorRequest, VisitorSettings } from './types';
import { getRequestStatusTone, withSocietyQuery } from './visitorApi';

export function GuardVisitorView(props: { societyId: string; transport: string; pollingMs: number }) {
  const queryClient = useQueryClient();
  const [towerId, setTowerId] = useState('');
  const [search, setSearch] = useState('');
  const [flatPage, setFlatPage] = useState(1);
  const [selectedFlat, setSelectedFlat] = useState<VisitorFlatTile | null>(null);
  const FLATS_PAGE_SIZE = 24;
  const [isOnline, setIsOnline] = useState(() => navigator.onLine);

  const { data: assignments = [] } = useQuery({
    queryKey: ['guard-assignments', props.societyId],
    queryFn: () => extractData<any[]>(api.get(withSocietyQuery('/guard-assignments/me', props.societyId))),
  });
  const gates = useMemo<VisitorGate[]>(() => {
    const items = assignments.flatMap((assignment) => assignment.gateIds || []);
    return Object.values(items.reduce<Record<string, VisitorGate>>((acc, gate) => ({ ...acc, [gate._id]: gate }), {}));
  }, [assignments]);

  const { data: settings } = useQuery({
    queryKey: ['visitor-settings', props.societyId],
    queryFn: () => extractData<VisitorSettings>(api.get(withSocietyQuery('/visitor/settings', props.societyId))),
  });
  const { data: towers = [] } = useQuery({
    queryKey: ['visitor-towers', props.societyId],
    queryFn: () => extractData<Tower[]>(api.get(withSocietyQuery('/visitor/towers', props.societyId))),
  });

  useEffect(() => {
    if (!towerId && towers[0]?._id) setTowerId(towers[0]._id);
  }, [towerId, towers]);
  useEffect(() => {
    setFlatPage(1);
  }, [towerId, search]);
  useEffect(() => {
    const update = () => setIsOnline(navigator.onLine);
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => { window.removeEventListener('online', update); window.removeEventListener('offline', update); };
  }, []);

  const { data: flats } = useQuery({
    queryKey: ['visitor-flats', props.societyId, towerId, search, flatPage, props.transport],
    queryFn: () => extractData<PaginatedResult<VisitorFlatTile>>(api.get(withSocietyQuery(`/visitor/towers/${towerId}/flats?limit=${FLATS_PAGE_SIZE}&page=${flatPage}&search=${encodeURIComponent(search)}`, props.societyId))),
    enabled: !!towerId,
    refetchInterval: props.transport === 'polling' ? props.pollingMs : false,
  });
  const { data: pendingRequests } = useQuery({
    queryKey: ['visitor-requests-pending', props.societyId, props.transport],
    queryFn: () => extractData<PaginatedResult<VisitorRequest>>(api.get(withSocietyQuery('/visitor/requests?status=PENDING_APPROVAL&limit=5', props.societyId))),
    refetchInterval: props.transport === 'polling' ? props.pollingMs : false,
  });
  const { data: approvedRequests } = useQuery({
    queryKey: ['visitor-requests-approved', props.societyId, props.transport],
    queryFn: () => extractData<PaginatedResult<VisitorRequest>>(api.get(withSocietyQuery('/visitor/requests?status=APPROVED&limit=10', props.societyId))),
    refetchInterval: props.transport === 'polling' ? props.pollingMs : false,
  });
  const { data: insideRequests } = useQuery({
    queryKey: ['visitor-requests-inside', props.societyId, props.transport],
    queryFn: () => extractData<PaginatedResult<VisitorRequest>>(api.get(withSocietyQuery('/visitor/requests?status=ENTRY_CONFIRMED&limit=10', props.societyId))),
    refetchInterval: props.transport === 'polling' ? props.pollingMs : false,
    enabled: settings?.exitConfirmationMode === 'GUARD',
  });

  const invalidateVisitorQueries = () => {
    queryClient.invalidateQueries({ queryKey: ['visitor-flats'] });
    queryClient.invalidateQueries({ queryKey: ['visitor-requests-pending'] });
    queryClient.invalidateQueries({ queryKey: ['visitor-requests-approved'] });
    queryClient.invalidateQueries({ queryKey: ['visitor-requests-inside'] });
  };

  const createMutation = useMutation({
    mutationFn: (payload: any) => api.post('/visitor/requests', { ...payload, societyId: props.societyId }),
    onSuccess: invalidateVisitorQueries,
  });
  const confirmEntryMutation = useMutation({
    mutationFn: (requestId: string) => api.post(`/visitor/requests/${requestId}/confirm-entry`, { societyId: props.societyId }),
    onSuccess: invalidateVisitorQueries,
  });
  const confirmExitMutation = useMutation({
    mutationFn: (requestId: string) => api.post(`/visitor/requests/${requestId}/confirm-exit`, { societyId: props.societyId }),
    onSuccess: invalidateVisitorQueries,
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Guard Visitor Desk" subtitle="Fast tower-to-flat approvals with live resident response" action={<div className={cn('rounded-full px-3 py-1 text-xs font-semibold', isOnline ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700')}>{isOnline ? <Wifi className="mr-1 inline h-3 w-3" /> : <WifiOff className="mr-1 inline h-3 w-3" />} {props.transport.toUpperCase()}</div>} />
      <div className="grid gap-4 lg:grid-cols-[1.1fr,0.9fr]">
        <div className="space-y-4">
          <div className="card p-4">
            <div className="grid gap-3 md:grid-cols-[220px,1fr]">
              <select value={towerId} onChange={(event) => setTowerId(event.target.value)} className="input">
                {towers.map((tower) => <option key={tower._id} value={tower._id}>{tower.name}</option>)}
              </select>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search flat number" className="input pl-9" />
              </div>
            </div>
          </div>
          {flats?.items?.length ? (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {flats.items.map((flat) => (
                <button key={flat._id} onClick={() => setSelectedFlat(flat)} className={cn('rounded-3xl border p-4 text-left transition-all hover:-translate-y-0.5 hover:shadow-card-hover', getRequestStatusTone(flat.activeRequest?.status))}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xl font-bold">{flat.flatNo}</p>
                      <p className="mt-1 text-xs opacity-80">{flat.activeRequest?.status?.replace(/_/g, ' ') || 'Ready for new visitor'}</p>
                    </div>
                    <div className="rounded-2xl bg-white/70 p-2 text-slate-600">
                      <ShieldCheck className="h-4 w-4" />
                    </div>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <EmptyState icon={ShieldCheck} title="No flats available" description="Pick another tower or clear the flat search to continue." />
          )}
          {flats && flats.total > FLATS_PAGE_SIZE && (
            <div className="flex items-center justify-between gap-3 px-1 text-sm text-slate-500">
              <button
                onClick={() => setFlatPage((page) => Math.max(1, page - 1))}
                disabled={flatPage <= 1}
                className="btn-secondary gap-1 px-3 py-1.5 text-xs disabled:opacity-40"
              >
                <ChevronLeft className="h-3.5 w-3.5" /> Prev
              </button>
              <span>Page {flats.page} of {flats.totalPages}</span>
              <button
                onClick={() => setFlatPage((page) => Math.min(flats.totalPages, page + 1))}
                disabled={flatPage >= flats.totalPages}
                className="btn-secondary gap-1 px-3 py-1.5 text-xs disabled:opacity-40"
              >
                Next <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>
        <div className="space-y-4">
          <div className="card p-5">
            <p className="text-sm font-semibold text-slate-800">Pending Requests</p>
            <div className="mt-4 space-y-3">
              {(pendingRequests?.items || []).map((request) => <div key={request._id} className="rounded-2xl border border-slate-100 p-4"><p className="font-semibold text-slate-800">{request.visitorName}</p><p className="mt-1 text-sm text-slate-500">{typeof request.flatId === 'string' ? request.flatId : request.flatId.flatNo}</p><p className="mt-2 text-xs text-slate-400">{formatDateTime(request.createdAt)}</p></div>)}
              {!pendingRequests?.items?.length && <p className="text-sm text-slate-500">No pending approvals at the moment.</p>}
            </div>
          </div>
          <div className="card p-5">
            <p className="text-sm font-semibold text-slate-800">Awaiting Entry</p>
            <div className="mt-4 space-y-3">
              {(approvedRequests?.items || []).map((request) => (
                <div key={request._id} className="flex items-center justify-between gap-3 rounded-2xl border border-emerald-100 bg-emerald-50/40 p-4">
                  <div>
                    <p className="font-semibold text-slate-800">{request.visitorName}</p>
                    <p className="mt-1 text-sm text-slate-500">{typeof request.flatId === 'string' ? request.flatId : request.flatId.flatNo}</p>
                  </div>
                  <button
                    onClick={() => confirmEntryMutation.mutate(request._id)}
                    disabled={confirmEntryMutation.isPending}
                    className="btn-primary shrink-0 gap-2 text-sm"
                  >
                    <DoorOpen className="h-4 w-4" /> Confirm Entry
                  </button>
                </div>
              ))}
              {!approvedRequests?.items?.length && <p className="text-sm text-slate-500">No approved visitors waiting to enter.</p>}
            </div>
          </div>
          {settings?.exitConfirmationMode === 'GUARD' && (
            <div className="card p-5">
              <p className="text-sm font-semibold text-slate-800">Currently Inside</p>
              <div className="mt-4 space-y-3">
                {(insideRequests?.items || []).map((request) => (
                  <div key={request._id} className="flex items-center justify-between gap-3 rounded-2xl border border-sky-100 bg-sky-50/40 p-4">
                    <div>
                      <p className="font-semibold text-slate-800">{request.visitorName}</p>
                      <p className="mt-1 text-sm text-slate-500">{typeof request.flatId === 'string' ? request.flatId : request.flatId.flatNo}</p>
                    </div>
                    <button
                      onClick={() => confirmExitMutation.mutate(request._id)}
                      disabled={confirmExitMutation.isPending}
                      className="btn-secondary shrink-0 gap-2 text-sm"
                    >
                      <LogOut className="h-4 w-4" /> Confirm Exit
                    </button>
                  </div>
                ))}
                {!insideRequests?.items?.length && <p className="text-sm text-slate-500">No visitors currently inside.</p>}
              </div>
            </div>
          )}
        </div>
      </div>

      {selectedFlat && settings && (
        <VisitorRequestModal
          isOpen={!!selectedFlat}
          onClose={() => setSelectedFlat(null)}
          societyId={props.societyId}
          flatId={selectedFlat._id}
          flatNo={selectedFlat.flatNo}
          gates={gates}
          settings={settings}
          onSubmit={(payload) => createMutation.mutateAsync(payload).then(() => undefined)}
        />
      )}
    </div>
  );
}
