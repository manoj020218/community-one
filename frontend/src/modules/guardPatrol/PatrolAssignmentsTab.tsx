import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, UserCog, Ban } from 'lucide-react';
import toast from 'react-hot-toast';
import { api, extractData } from '../../services/api';
import { Modal } from '../../components/common/Modal';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { EmptyState } from '../../components/common/EmptyState';
import { useAuthStore } from '../../store/authStore';
import { useSocietyStore } from '../../store/societyStore';
import { User } from '../../types';
import { PatrolAssignment, PatrolRoute } from './guardPatrol.types';

const BLANK_FORM = { userId: '', routeId: '', shiftStart: '', shiftEnd: '' };

export function PatrolAssignmentsTab() {
  const { user } = useAuthStore();
  const { currentSociety } = useSocietyStore();
  const societyId = currentSociety?._id || user?.societyId || '';
  const queryClient = useQueryClient();

  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(BLANK_FORM);
  const [disableTarget, setDisableTarget] = useState<PatrolAssignment | null>(null);

  const { data: assignments, isLoading } = useQuery({
    queryKey: ['patrol-assignments', societyId],
    queryFn: () => extractData<PatrolAssignment[]>(api.get('/guard-patrol/assignments', { params: { societyId } })),
    enabled: !!societyId,
  });

  const { data: routes } = useQuery({
    queryKey: ['patrol-routes', societyId],
    queryFn: () => extractData<PatrolRoute[]>(api.get('/guard-patrol/routes', { params: { societyId } })),
    enabled: !!societyId,
  });

  const { data: users } = useQuery({
    queryKey: ['users', societyId],
    queryFn: () => extractData<User[]>(api.get(`/users/society/${societyId}`)),
    enabled: !!societyId,
  });
  const guards = (users || []).filter((u) => u.roleCode === 'SECURITY_GUARD');

  const createMutation = useMutation({
    mutationFn: () => api.post('/guard-patrol/assignments', {
      ...form, societyId,
      shiftStart: form.shiftStart || undefined,
      shiftEnd: form.shiftEnd || undefined,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patrol-assignments'] });
      setShowModal(false);
      setForm(BLANK_FORM);
      toast.success('Guard assigned');
    },
    onError: (err: any) => toast.error(err?.response?.data?.error?.message || 'Failed to assign guard'),
  });

  const disableMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/guard-patrol/assignments/${id}/disable`, {}, { params: { societyId } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patrol-assignments'] });
      setDisableTarget(null);
      toast.success('Assignment removed');
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">Assign a guard to a patrol route, with an optional shift window.</p>
        <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2"><Plus className="w-4 h-4" /> Assign Guard</button>
      </div>

      {isLoading ? (
        <div className="card p-8 text-center text-slate-400">Loading...</div>
      ) : !assignments?.length ? (
        <EmptyState icon={UserCog} title="No assignments yet" description="Assign a guard to a route to get them into the patrol rotation." action={<button onClick={() => setShowModal(true)} className="btn-primary">Assign Guard</button>} />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {assignments.map((a) => (
            <div key={a._id} className="card p-4 space-y-1">
              <div className="flex items-center justify-between">
                <p className="font-semibold text-slate-800 text-sm">{typeof a.userId === 'object' ? a.userId.name : a.userId}</p>
                <button onClick={() => setDisableTarget(a)} className="p-1.5 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600" title="Remove"><Ban className="w-3.5 h-3.5" /></button>
              </div>
              <p className="text-xs text-slate-500">Route: {typeof a.routeId === 'object' ? a.routeId.name : a.routeId}</p>
              {(a.shiftStart || a.shiftEnd) && <p className="text-xs text-slate-400">Shift: {a.shiftStart || '—'} – {a.shiftEnd || '—'}</p>}
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Assign Guard">
        <div className="space-y-4">
          <div><label className="label">Guard <span className="text-red-500">*</span></label>
            <select value={form.userId} onChange={(e) => setForm((f) => ({ ...f, userId: e.target.value }))} className="input">
              <option value="">Select guard...</option>
              {guards.map((g) => <option key={g._id} value={g._id}>{g.name} — {g.mobile}</option>)}
            </select>
            {!guards.length && <p className="mt-1 text-xs text-slate-400">No Security Guard accounts yet — create one from Users first.</p>}
          </div>
          <div><label className="label">Route <span className="text-red-500">*</span></label>
            <select value={form.routeId} onChange={(e) => setForm((f) => ({ ...f, routeId: e.target.value }))} className="input">
              <option value="">Select route...</option>
              {routes?.map((r) => <option key={r._id} value={r._id}>{r.name}</option>)}
            </select></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="label">Shift Start <span className="text-slate-400 font-normal">(optional)</span></label>
              <input type="time" value={form.shiftStart} onChange={(e) => setForm((f) => ({ ...f, shiftStart: e.target.value }))} className="input" /></div>
            <div><label className="label">Shift End <span className="text-slate-400 font-normal">(optional)</span></label>
              <input type="time" value={form.shiftEnd} onChange={(e) => setForm((f) => ({ ...f, shiftEnd: e.target.value }))} className="input" /></div>
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={() => createMutation.mutate()} disabled={createMutation.isPending || !form.userId || !form.routeId} className="btn-primary flex-1">
              {createMutation.isPending ? 'Assigning...' : 'Assign'}
            </button>
            <button onClick={() => setShowModal(false)} className="btn-secondary">Cancel</button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={!!disableTarget}
        title="Remove this assignment?"
        message="The guard will no longer see this route in their Patrol Mode."
        confirmLabel="Remove"
        danger
        isPending={disableMutation.isPending}
        onConfirm={() => disableTarget && disableMutation.mutate(disableTarget._id)}
        onCancel={() => setDisableTarget(null)}
      />
    </div>
  );
}
