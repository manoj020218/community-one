import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { UserPlus, Phone, Home, CheckCircle2, XCircle, Eye, EyeOff, Smartphone, Link2 } from 'lucide-react';
import { api, extractData } from '../../services/api';
import { PageHeader } from '../../components/common/PageHeader';
import { EmptyState } from '../../components/common/EmptyState';
import { Modal } from '../../components/common/Modal';
import { TableSkeleton } from '../../components/common/LoadingSkeleton';
import { useAuthStore } from '../../store/authStore';
import { useSocietyStore } from '../../store/societyStore';
import { JoinRequest } from '../../types';
import { ShareCredentialsModal, NewUserCredentials } from '../users/ShareCredentialsModal';
import toast from 'react-hot-toast';

const MEMBER_TYPES = ['OWNER', 'TENANT', 'FAMILY_MEMBER', 'STAFF', 'VENDOR'];
const PIN_MEMBER_TYPES = ['OWNER', 'TENANT', 'FAMILY_MEMBER'];
const STATUS_TABS: { value: string; label: string }[] = [
  { value: 'PENDING', label: 'Pending' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'REJECTED', label: 'Rejected' },
];

function matchedResident(r: JoinRequest) {
  return typeof r.matchedResidentId === 'object' ? r.matchedResidentId : null;
}

export function JoinRequestsPage() {
  const { user } = useAuthStore();
  const { currentSociety } = useSocietyStore();
  const societyId = currentSociety?._id || user?.societyId || '';
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('PENDING');

  const [approveTarget, setApproveTarget] = useState<JoinRequest | null>(null);
  const [approvePassword, setApprovePassword] = useState('');
  const [showApprovePassword, setShowApprovePassword] = useState(false);
  const [approveFlatId, setApproveFlatId] = useState('');
  const [approveMemberType, setApproveMemberType] = useState('OWNER');

  const [rejectTarget, setRejectTarget] = useState<JoinRequest | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const [shareCredentials, setShareCredentials] = useState<NewUserCredentials | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['join-requests', societyId, statusFilter],
    queryFn: () => extractData<any>(api.get(`/join-requests/society/${societyId}?status=${statusFilter}&limit=50`)),
    enabled: !!societyId,
  });

  // Only needed for the "no matching resident" approval path, where the admin has to pick
  // which flat this new person belongs to — same list Add Resident uses.
  const { data: flats } = useQuery({
    queryKey: ['flats-list', societyId],
    queryFn: () => extractData<any>(api.get(`/flats/society/${societyId}?limit=500`)),
    enabled: !!societyId && !!approveTarget && !matchedResident(approveTarget),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['join-requests'] });

  const approveMutation = useMutation({
    mutationFn: () => api.post(`/join-requests/${approveTarget?._id}/approve`, {
      password: approvePassword,
      ...(matchedResident(approveTarget!) ? {} : { flatId: approveFlatId, memberType: approveMemberType, primaryContact: true }),
    }),
    onSuccess: () => {
      invalidate();
      toast.success('Request approved — login created');
      if (approveTarget) {
        setShareCredentials({
          name: approveTarget.name,
          roleLabel: matchedResident(approveTarget) ? 'Resident' : approveMemberType,
          email: '',
          mobile: approveTarget.mobile,
          password: approvePassword,
        });
      }
      closeApprove();
    },
    onError: (err: any) => toast.error(err?.response?.data?.error?.message || 'Failed to approve request'),
  });

  const rejectMutation = useMutation({
    mutationFn: () => api.post(`/join-requests/${rejectTarget?._id}/reject`, { reason: rejectReason || undefined }),
    onSuccess: () => {
      invalidate();
      toast.success('Request rejected');
      setRejectTarget(null);
      setRejectReason('');
    },
    onError: (err: any) => toast.error(err?.response?.data?.error?.message || 'Failed to reject request'),
  });

  const openApprove = (r: JoinRequest) => {
    setApproveTarget(r);
    setApprovePassword('');
    setApproveFlatId('');
    setApproveMemberType('OWNER');
  };

  const closeApprove = () => {
    setApproveTarget(null);
    setApprovePassword('');
    setApproveFlatId('');
  };

  const isPinType = PIN_MEMBER_TYPES.includes(approveMemberType);
  const canApprove = approveTarget && approvePassword && (matchedResident(approveTarget) || approveFlatId);

  return (
    <div className="space-y-6">
      <PageHeader title="Join Requests" subtitle="Members who requested to join using your society code" />

      <div className="card p-4">
        <div className="inline-flex items-center gap-1 p-1 rounded-xl bg-slate-100">
          {STATUS_TABS.map((t) => (
            <button
              key={t.value}
              onClick={() => setStatusFilter(t.value)}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors ${statusFilter === t.value ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? <TableSkeleton rows={4} cols={5} /> : (
        <div className="card overflow-hidden">
          {!data?.items?.length ? (
            <EmptyState icon={UserPlus} title={`No ${statusFilter.toLowerCase()} requests`} description="Requests submitted from the app's Join Society screen will show up here" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead><tr className="border-b border-slate-100">
                  <th className="table-header text-left">Requester</th>
                  <th className="table-header text-left">Contact</th>
                  <th className="table-header text-left">Claimed Flat</th>
                  <th className="table-header text-left">Match</th>
                  {statusFilter === 'PENDING' && <th className="table-header text-left">Actions</th>}
                  {statusFilter === 'REJECTED' && <th className="table-header text-left">Reason</th>}
                </tr></thead>
                <tbody className="divide-y divide-slate-50">
                  {data.items.map((r: JoinRequest) => {
                    const resident = matchedResident(r);
                    return (
                      <tr key={r._id} className="table-row">
                        <td className="table-cell">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-xl flex items-center justify-center text-white text-sm font-bold">{r.name[0]}</div>
                            <p className="font-semibold text-slate-800 text-sm">{r.name}</p>
                          </div>
                        </td>
                        <td className="table-cell">
                          <div className="flex items-center gap-1 text-xs text-slate-600"><Phone className="w-3 h-3 text-slate-400" />{r.mobile}</div>
                          {r.email && <p className="text-xs text-slate-400 mt-0.5">{r.email}</p>}
                        </td>
                        <td className="table-cell"><div className="flex items-center gap-1 text-xs text-slate-600"><Home className="w-3 h-3 text-slate-400" />{r.claimedFlatNo || '—'}</div></td>
                        <td className="table-cell">
                          {resident ? (
                            <span className="flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-1 rounded-lg w-fit">
                              <Link2 className="w-3 h-3" /> {resident.name}{resident.flatId?.flatNo ? ` · ${resident.flatId.flatNo}` : ''}
                            </span>
                          ) : (
                            <span className="text-xs text-slate-400">No existing record</span>
                          )}
                        </td>
                        {statusFilter === 'PENDING' && (
                          <td className="table-cell">
                            <div className="flex items-center gap-2">
                              <button onClick={() => openApprove(r)} className="flex items-center gap-1 text-xs font-medium text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1.5 rounded-lg transition-colors">
                                <CheckCircle2 className="w-3.5 h-3.5" /> Approve
                              </button>
                              <button onClick={() => { setRejectTarget(r); setRejectReason(''); }} className="flex items-center gap-1 text-xs font-medium text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 px-2.5 py-1.5 rounded-lg transition-colors">
                                <XCircle className="w-3.5 h-3.5" /> Reject
                              </button>
                            </div>
                          </td>
                        )}
                        {statusFilter === 'REJECTED' && (
                          <td className="table-cell text-xs text-slate-500">{r.rejectionReason || '—'}</td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Approve Modal */}
      <Modal isOpen={!!approveTarget} onClose={closeApprove} title={`Approve — ${approveTarget?.name || ''}`}>
        <div className="space-y-4">
          {approveTarget && matchedResident(approveTarget) ? (
            <p className="text-sm text-slate-500">
              This matches an existing resident record for <strong>{matchedResident(approveTarget)?.name}</strong>. Set a password to grant their app login.
            </p>
          ) : (
            <>
              <p className="text-sm text-slate-500">No existing resident record matched this request — pick the flat and member type to add them.</p>
              <div>
                <label className="label">Flat <span className="text-red-500">*</span></label>
                <select value={approveFlatId} onChange={(e) => setApproveFlatId(e.target.value)} className="input" required>
                  <option value="">Select flat...</option>
                  {flats?.items?.map((f: any) => (
                    <option key={f._id} value={f._id}>{f.towerId?.name ? `${f.towerId.name} - ${f.flatNo}` : f.flatNo}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Member Type</label>
                <select value={approveMemberType} onChange={(e) => setApproveMemberType(e.target.value)} className="input">
                  {MEMBER_TYPES.map((t) => <option key={t}>{t}</option>)}
                </select>
              </div>
            </>
          )}
          <div>
            <label className="label">{isPinType ? 'PIN' : 'Password'} <span className="text-red-500">*</span></label>
            <div className="relative">
              <input
                type={showApprovePassword ? 'text' : 'password'}
                inputMode={isPinType ? 'numeric' : undefined}
                maxLength={isPinType ? 6 : undefined}
                value={approvePassword}
                onChange={(e) => setApprovePassword(e.target.value)}
                placeholder={isPinType ? '4-6 digit PIN' : 'Min 8 characters'}
                className="input pr-10"
              />
              <button type="button" onClick={() => setShowApprovePassword((s) => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                {showApprovePassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={() => approveMutation.mutate()} disabled={approveMutation.isPending || !canApprove} className="btn-primary flex-1 flex items-center justify-center gap-2">
              <Smartphone className="w-4 h-4" /> {approveMutation.isPending ? 'Approving...' : 'Approve & Grant Login'}
            </button>
            <button onClick={closeApprove} className="btn-secondary">Cancel</button>
          </div>
        </div>
      </Modal>

      {/* Reject Modal */}
      <Modal isOpen={!!rejectTarget} onClose={() => setRejectTarget(null)} title={`Reject — ${rejectTarget?.name || ''}`}>
        <div className="space-y-4">
          <div>
            <label className="label">Reason <span className="text-slate-400 font-normal">(optional)</span></label>
            <textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} className="input resize-none" rows={3} placeholder="e.g. Could not verify this person is a resident" />
          </div>
          <div className="flex gap-3 pt-1">
            <button onClick={() => rejectMutation.mutate()} disabled={rejectMutation.isPending} className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium bg-red-600 text-white hover:bg-red-700 disabled:opacity-60 transition-colors">
              <XCircle className="w-4 h-4" /> {rejectMutation.isPending ? 'Rejecting...' : 'Reject Request'}
            </button>
            <button onClick={() => setRejectTarget(null)} className="btn-secondary">Cancel</button>
          </div>
        </div>
      </Modal>

      <ShareCredentialsModal credentials={shareCredentials} onClose={() => setShareCredentials(null)} societyName={currentSociety?.name} />
    </div>
  );
}
