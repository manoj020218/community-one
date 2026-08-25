import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Route as RouteIcon, Ban, GripVertical, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { api, extractData } from '../../services/api';
import { Modal } from '../../components/common/Modal';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { EmptyState } from '../../components/common/EmptyState';
import { useAuthStore } from '../../store/authStore';
import { useSocietyStore } from '../../store/societyStore';
import { PatrolCheckpoint, PatrolRoute } from './guardPatrol.types';

const BLANK_FORM = { name: '', checkpointIds: [] as string[], alertThresholdMinutes: '' as number | '' };

export function PatrolRoutesTab() {
  const { user } = useAuthStore();
  const { currentSociety } = useSocietyStore();
  const societyId = currentSociety?._id || user?.societyId || '';
  const queryClient = useQueryClient();

  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(BLANK_FORM);
  const [disableTarget, setDisableTarget] = useState<PatrolRoute | null>(null);

  const { data: routes, isLoading } = useQuery({
    queryKey: ['patrol-routes', societyId],
    queryFn: () => extractData<PatrolRoute[]>(api.get('/guard-patrol/routes', { params: { societyId } })),
    enabled: !!societyId,
  });

  const { data: checkpoints } = useQuery({
    queryKey: ['patrol-checkpoints', societyId],
    queryFn: () => extractData<PatrolCheckpoint[]>(api.get('/guard-patrol/checkpoints', { params: { societyId } })),
    enabled: !!societyId,
  });

  const createMutation = useMutation({
    mutationFn: () => api.post('/guard-patrol/routes', {
      ...form, societyId,
      alertThresholdMinutes: form.alertThresholdMinutes || undefined,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patrol-routes'] });
      setShowModal(false);
      setForm(BLANK_FORM);
      toast.success('Route created');
    },
    onError: (err: any) => toast.error(err?.response?.data?.error?.message || 'Failed to create route'),
  });

  const disableMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/guard-patrol/routes/${id}/disable`, {}, { params: { societyId } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patrol-routes'] });
      setDisableTarget(null);
      toast.success('Route disabled');
    },
  });

  const addCheckpoint = (id: string) => {
    if (form.checkpointIds.includes(id)) return;
    setForm((f) => ({ ...f, checkpointIds: [...f.checkpointIds, id] }));
  };
  const removeCheckpoint = (id: string) => setForm((f) => ({ ...f, checkpointIds: f.checkpointIds.filter((c) => c !== id) }));
  const move = (index: number, dir: -1 | 1) => {
    setForm((f) => {
      const next = [...f.checkpointIds];
      const target = index + dir;
      if (target < 0 || target >= next.length) return f;
      [next[index], next[target]] = [next[target], next[index]];
      return { ...f, checkpointIds: next };
    });
  };
  const checkpointName = (id: string) => checkpoints?.find((c) => c._id === id)?.name || id;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">A route is an ordered sequence of checkpoints — the round a guard is expected to walk.</p>
        <button onClick={() => { setForm(BLANK_FORM); setShowModal(true); }} className="btn-primary flex items-center gap-2"><Plus className="w-4 h-4" /> Add Route</button>
      </div>

      {isLoading ? (
        <div className="card p-8 text-center text-slate-400">Loading...</div>
      ) : !routes?.length ? (
        <EmptyState icon={RouteIcon} title="No routes yet" description="Build a route from your checkpoints to assign to guards." action={<button onClick={() => setShowModal(true)} className="btn-primary">Add Route</button>} />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {routes.map((r) => (
            <div key={r._id} className="card p-4 space-y-2">
              <div className="flex items-center justify-between">
                <p className="font-semibold text-slate-800 text-sm">{r.name}</p>
                <button onClick={() => setDisableTarget(r)} className="p-1.5 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600" title="Disable"><Ban className="w-3.5 h-3.5" /></button>
              </div>
              <p className="text-xs text-slate-500">{r.checkpointIds.length} checkpoint{r.checkpointIds.length === 1 ? '' : 's'}{r.alertThresholdMinutes ? ` · alert after ${r.alertThresholdMinutes} min` : ''}</p>
              <div className="flex flex-wrap gap-1.5">
                {(r.checkpointIds as any[]).map((c, i) => (
                  <span key={typeof c === 'object' ? c._id : c} className="badge badge-gray text-[11px]">{i + 1}. {typeof c === 'object' ? c.name : checkpointName(c)}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Add Route">
        <div className="space-y-4">
          <div><label className="label">Name <span className="text-red-500">*</span></label>
            <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className="input" placeholder="Night Round — Block A" /></div>
          <div><label className="label">Alert Threshold <span className="text-slate-400 font-normal">(minutes, optional — overrides society default)</span></label>
            <input type="number" min={1} value={form.alertThresholdMinutes} onChange={(e) => setForm((f) => ({ ...f, alertThresholdMinutes: e.target.value ? Number(e.target.value) : '' }))} className="input" placeholder="5" /></div>
          <div>
            <label className="label">Checkpoints (in order)</label>
            <div className="space-y-1 mb-2">
              {form.checkpointIds.map((id, i) => (
                <div key={id} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-50 border border-slate-100">
                  <GripVertical className="w-3.5 h-3.5 text-slate-300" />
                  <span className="flex-1 text-sm text-slate-700">{i + 1}. {checkpointName(id)}</span>
                  <button onClick={() => move(i, -1)} disabled={i === 0} className="text-slate-400 hover:text-slate-600 disabled:opacity-30 text-xs px-1">↑</button>
                  <button onClick={() => move(i, 1)} disabled={i === form.checkpointIds.length - 1} className="text-slate-400 hover:text-slate-600 disabled:opacity-30 text-xs px-1">↓</button>
                  <button onClick={() => removeCheckpoint(id)} className="text-slate-400 hover:text-red-600"><X className="w-3.5 h-3.5" /></button>
                </div>
              ))}
            </div>
            <select value="" onChange={(e) => e.target.value && addCheckpoint(e.target.value)} className="input">
              <option value="">+ Add a checkpoint...</option>
              {checkpoints?.filter((c) => !form.checkpointIds.includes(c._id)).map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
            </select>
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={() => createMutation.mutate()} disabled={createMutation.isPending || !form.name || !form.checkpointIds.length} className="btn-primary flex-1">
              {createMutation.isPending ? 'Creating...' : 'Create Route'}
            </button>
            <button onClick={() => setShowModal(false)} className="btn-secondary">Cancel</button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={!!disableTarget}
        title={`Disable ${disableTarget?.name}?`}
        message="Any guard assignment using this route will need to be updated."
        confirmLabel="Disable"
        danger
        isPending={disableMutation.isPending}
        onConfirm={() => disableTarget && disableMutation.mutate(disableTarget._id)}
        onCancel={() => setDisableTarget(null)}
      />
    </div>
  );
}
