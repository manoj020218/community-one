import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import { CheckCircle2, Clock3, XCircle } from 'lucide-react';
import { api, extractData } from '../../services/api';
import { PageHeader } from '../../components/common/PageHeader';
import { EmptyState } from '../../components/common/EmptyState';
import { PaginatedResult } from '../../types';
import { formatDateTime } from '../../utils/cn';
import { VisitorRequest } from './types';
import { withSocietyQuery } from './visitorApi';
import { VisitorPhoto } from './VisitorPhoto';

export function ResidentVisitorView(props: { societyId: string; transport: string; pollingMs: number }) {
  const queryClient = useQueryClient();
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  const { data } = useQuery({
    queryKey: ['visitor-resident-requests', props.societyId, props.transport],
    queryFn: () => extractData<PaginatedResult<VisitorRequest>>(api.get(withSocietyQuery('/visitor/requests?limit=20', props.societyId))),
    refetchInterval: props.transport === 'polling' ? props.pollingMs : false,
  });

  const approveMutation = useMutation({
    mutationFn: (requestId: string) => api.post(`/visitor/requests/${requestId}/approve`, { societyId: props.societyId }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['visitor-resident-requests'] }),
  });
  const rejectMutation = useMutation({
    mutationFn: (requestId: string) => api.post(`/visitor/requests/${requestId}/reject`, { societyId: props.societyId, rejectionReason }),
    onSuccess: () => {
      setRejectingId(null);
      setRejectionReason('');
      queryClient.invalidateQueries({ queryKey: ['visitor-resident-requests'] });
    },
  });

  const pending = (data?.items || []).filter((item) => item.status === 'PENDING_APPROVAL');
  const recent = (data?.items || []).filter((item) => item.status !== 'PENDING_APPROVAL');

  return (
    <div className="space-y-6">
      <PageHeader title="Visitor Approvals" subtitle="Review live gate requests for your flat and respond instantly." />
      {pending.length === 0 ? <EmptyState icon={Clock3} title="No pending visitors" description="New requests will appear here as soon as the guard sends them." /> : null}
      <div className="grid gap-4 lg:grid-cols-2">
        {pending.map((request) => (
          <div key={request._id} className="card p-5">
            <p className="text-lg font-semibold text-slate-900">{request.visitorName}</p>
            <p className="mt-1 text-sm text-slate-500">{typeof request.gateId === 'string' ? request.gateId : request.gateId.name} · {formatDistanceToNow(new Date(request.createdAt), { addSuffix: true })}</p>
            {request.visitorPhotoFileId ? <VisitorPhoto requestId={request._id} societyId={props.societyId} alt={request.visitorName} className="mt-4 h-44 w-full rounded-2xl object-cover" /> : null}
            <div className="mt-4 space-y-2 text-sm text-slate-600">
              {request.visitorMobile ? <p>Mobile: {request.visitorMobile}</p> : null}
              {request.purpose ? <p>Purpose: {request.purpose}</p> : null}
            </div>
            {rejectingId === request._id ? (
              <div className="mt-4 space-y-3">
                <textarea value={rejectionReason} onChange={(event) => setRejectionReason(event.target.value)} placeholder="Optional rejection reason" className="input min-h-28" />
                <div className="flex gap-3"><button onClick={() => rejectMutation.mutate(request._id)} className="btn-secondary text-rose-700">Confirm Reject</button><button onClick={() => setRejectingId(null)} className="btn-secondary">Back</button></div>
              </div>
            ) : (
              <div className="mt-5 flex gap-3">
                <button onClick={() => approveMutation.mutate(request._id)} className="btn-primary flex-1 justify-center gap-2"><CheckCircle2 className="h-4 w-4" /> Approve</button>
                <button onClick={() => setRejectingId(request._id)} className="btn-secondary flex-1 justify-center gap-2 text-rose-700"><XCircle className="h-4 w-4" /> Reject</button>
              </div>
            )}
          </div>
        ))}
      </div>

      {recent.length ? <div className="card p-5"><p className="text-sm font-semibold text-slate-800">Recent Decisions</p><div className="mt-3 space-y-3">{recent.map((request) => (
        <div key={request._id} className="rounded-2xl border border-slate-100 p-4">
          <div className="flex items-center justify-between gap-3"><p className="font-medium text-slate-800">{request.visitorName}</p><span className="text-xs font-semibold text-slate-500">{request.status.replace(/_/g, ' ')}</span></div>
          <p className="mt-1 text-xs text-slate-400">
            {request.decisionByUserId && typeof request.decisionByUserId !== 'string' ? `Handled by ${request.decisionByUserId.name} · ` : ''}
            {formatDateTime(request.decisionAt || request.statusChangedAt)}
          </p>
        </div>
      ))}</div></div> : null}
    </div>
  );
}
