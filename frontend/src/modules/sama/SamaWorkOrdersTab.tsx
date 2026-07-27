import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, ClipboardList, UserCheck, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { api, extractData } from '../../services/api';
import { Modal } from '../../components/common/Modal';
import { EmptyState } from '../../components/common/EmptyState';
import { TableSkeleton } from '../../components/common/LoadingSkeleton';
import { useAuthStore } from '../../store/authStore';
import { useSocietyStore } from '../../store/societyStore';
import { cn, formatDate } from '../../utils/cn';
import {
  PaginatedResult, SAMA_WORK_ORDER_PRIORITIES, SAMA_WORK_ORDER_STATUSES, ServiceProviderProfile,
  StaffProfile, WORK_ORDER_STATUS_BADGE, WorkOrder,
} from './sama.types';

const BLANK_CREATE = { title: '', description: '', category: '', priority: 'MEDIUM' as string };

export function SamaWorkOrdersTab() {
  const { user } = useAuthStore();
  const { currentSociety } = useSocietyStore();
  const societyId = currentSociety?._id || user?.societyId || '';
  const queryClient = useQueryClient();

  const [statusFilter, setStatusFilter] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState(BLANK_CREATE);
  const [assignOrderId, setAssignOrderId] = useState<string | null>(null);
  const [assignForm, setAssignForm] = useState({ assigneeType: 'STAFF_PROFILE' as string, assigneeId: '' });
  const [completeOrderId, setCompleteOrderId] = useState<string | null>(null);
  const [completionNotes, setCompletionNotes] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['sama-work-orders', societyId, statusFilter],
    queryFn: () => extractData<PaginatedResult<WorkOrder>>(api.get('/sama/work-orders', { params: { societyId, limit: 100, ...(statusFilter ? { status: statusFilter } : {}) } })),
    enabled: !!societyId,
  });

  const { data: staff } = useQuery({
    queryKey: ['sama-staff', societyId],
    queryFn: () => extractData<PaginatedResult<StaffProfile>>(api.get('/sama/staff-profiles', { params: { societyId, limit: 200 } })),
    enabled: !!societyId && !!assignOrderId,
  });

  const { data: providers } = useQuery({
    queryKey: ['sama-providers', societyId],
    queryFn: () => extractData<PaginatedResult<ServiceProviderProfile>>(api.get('/sama/service-providers', { params: { societyId, limit: 200 } })),
    enabled: !!societyId && !!assignOrderId,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['sama-work-orders'] });

  const createMutation = useMutation({
    mutationFn: () => api.post('/sama/work-orders', { societyId, ...createForm }),
    onSuccess: () => { invalidate(); setShowCreateModal(false); setCreateForm(BLANK_CREATE); toast.success('Work order created!'); },
  });

  const assignMutation = useMutation({
    mutationFn: () => api.patch(`/sama/work-orders/${assignOrderId}/assign`, {
      societyId,
      assignedStaffProfileId: assignForm.assigneeType === 'STAFF_PROFILE' ? assignForm.assigneeId : undefined,
      assignedServiceProviderId: assignForm.assigneeType === 'SERVICE_PROVIDER' ? assignForm.assigneeId : undefined,
    }),
    onSuccess: () => { invalidate(); setAssignOrderId(null); setAssignForm({ assigneeType: 'STAFF_PROFILE', assigneeId: '' }); toast.success('Work order assigned!'); },
  });

  const completeMutation = useMutation({
    mutationFn: () => api.patch(`/sama/work-orders/${completeOrderId}/complete`, { societyId, completionNotes: completionNotes || undefined }),
    onSuccess: () => { invalidate(); setCompleteOrderId(null); setCompletionNotes(''); toast.success('Work order completed!'); },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="input w-auto">
          <option value="">All statuses</option>
          {SAMA_WORK_ORDER_STATUSES.map((s) => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
        </select>
        <button onClick={() => setShowCreateModal(true)} className="btn-primary flex items-center gap-2 text-sm">
          <Plus className="w-4 h-4" /> Create Work Order
        </button>
      </div>

      {isLoading ? <TableSkeleton rows={5} cols={6} /> : !data?.items?.length ? (
        <EmptyState icon={ClipboardList} title="No work orders yet" description="Create a work order to assign repair or service tasks to staff or providers."
          action={<button onClick={() => setShowCreateModal(true)} className="btn-primary">Create Work Order</button>} />
      ) : (
        <div className="card overflow-hidden overflow-x-auto">
          <table className="w-full">
            <thead><tr>
              <th className="table-header text-left">Code</th>
              <th className="table-header text-left">Title</th>
              <th className="table-header text-left">Priority</th>
              <th className="table-header text-left">SLA</th>
              <th className="table-header text-left">Status</th>
              <th className="table-header text-left">Actions</th>
            </tr></thead>
            <tbody>
              {data.items.map((wo) => (
                <tr key={wo._id} className="table-row">
                  <td className="table-cell font-mono text-xs">{wo.workOrderCode}</td>
                  <td className="table-cell font-medium text-slate-800">{wo.title}</td>
                  <td className="table-cell text-xs text-slate-500">{wo.priority}</td>
                  <td className="table-cell text-xs">{wo.slaBreached ? <span className="text-red-600 font-medium">Breached</span> : wo.slaDueAt ? formatDate(wo.slaDueAt) : '—'}</td>
                  <td className="table-cell"><span className={cn('badge', WORK_ORDER_STATUS_BADGE[wo.status])}>{wo.status.replace(/_/g, ' ')}</span></td>
                  <td className="table-cell">
                    <div className="flex gap-2">
                      {wo.status === 'OPEN' && (
                        <button onClick={() => setAssignOrderId(wo._id)} className="text-primary-600 hover:text-primary-700 flex items-center gap-1 text-xs font-medium">
                          <UserCheck className="w-3.5 h-3.5" /> Assign
                        </button>
                      )}
                      {wo.status === 'ASSIGNED' && (
                        <button onClick={() => setCompleteOrderId(wo._id)} className="text-emerald-600 hover:text-emerald-700 flex items-center gap-1 text-xs font-medium">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Complete
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} title="Create Work Order">
        <div className="space-y-4">
          <div><label className="label">Title <span className="text-red-500">*</span></label>
            <input value={createForm.title} onChange={(e) => setCreateForm((f) => ({ ...f, title: e.target.value }))} className="input" /></div>
          <div><label className="label">Category <span className="text-red-500">*</span></label>
            <input value={createForm.category} onChange={(e) => setCreateForm((f) => ({ ...f, category: e.target.value }))} className="input" placeholder="PLUMBING" /></div>
          <div><label className="label">Priority</label>
            <select value={createForm.priority} onChange={(e) => setCreateForm((f) => ({ ...f, priority: e.target.value }))} className="input">
              {SAMA_WORK_ORDER_PRIORITIES.map((p) => <option key={p}>{p}</option>)}
            </select></div>
          <div><label className="label">Description</label>
            <textarea value={createForm.description} onChange={(e) => setCreateForm((f) => ({ ...f, description: e.target.value }))} className="input resize-none" rows={2} /></div>
          <div className="flex gap-3 pt-2">
            <button onClick={() => createMutation.mutate()} disabled={createMutation.isPending || !createForm.title || !createForm.category} className="btn-primary flex-1">
              {createMutation.isPending ? 'Creating...' : 'Create'}
            </button>
            <button onClick={() => setShowCreateModal(false)} className="btn-secondary">Cancel</button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={!!assignOrderId} onClose={() => setAssignOrderId(null)} title="Assign Work Order">
        <div className="space-y-4">
          <div><label className="label">Assignee Type</label>
            <select value={assignForm.assigneeType} onChange={(e) => setAssignForm({ assigneeType: e.target.value, assigneeId: '' })} className="input">
              <option value="STAFF_PROFILE">Staff</option>
              <option value="SERVICE_PROVIDER">Service Provider</option>
            </select></div>
          <div><label className="label">Assignee <span className="text-red-500">*</span></label>
            <select value={assignForm.assigneeId} onChange={(e) => setAssignForm((f) => ({ ...f, assigneeId: e.target.value }))} className="input">
              <option value="">Select...</option>
              {assignForm.assigneeType === 'STAFF_PROFILE'
                ? staff?.items?.map((s) => <option key={s._id} value={s._id}>{s.displayName}</option>)
                : providers?.items?.map((p) => <option key={p._id} value={p._id}>{p.displayName}</option>)}
            </select></div>
          <div className="flex gap-3 pt-2">
            <button onClick={() => assignMutation.mutate()} disabled={assignMutation.isPending || !assignForm.assigneeId} className="btn-primary flex-1">
              {assignMutation.isPending ? 'Assigning...' : 'Assign'}
            </button>
            <button onClick={() => setAssignOrderId(null)} className="btn-secondary">Cancel</button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={!!completeOrderId} onClose={() => setCompleteOrderId(null)} title="Complete Work Order">
        <div className="space-y-4">
          <div><label className="label">Completion Notes</label>
            <textarea value={completionNotes} onChange={(e) => setCompletionNotes(e.target.value)} className="input resize-none" rows={3} /></div>
          <div className="flex gap-3 pt-2">
            <button onClick={() => completeMutation.mutate()} disabled={completeMutation.isPending} className="btn-primary flex-1">
              {completeMutation.isPending ? 'Completing...' : 'Mark Completed'}
            </button>
            <button onClick={() => setCompleteOrderId(null)} className="btn-secondary">Cancel</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
