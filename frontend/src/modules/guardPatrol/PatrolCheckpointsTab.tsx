import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, QrCode, Nfc, Download, Ban } from 'lucide-react';
import toast from 'react-hot-toast';
import { api, extractData } from '../../services/api';
import { Modal } from '../../components/common/Modal';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { EmptyState } from '../../components/common/EmptyState';
import { useAuthStore } from '../../store/authStore';
import { useSocietyStore } from '../../store/societyStore';
import { Tower } from '../../types';
import { PatrolCheckpoint } from './guardPatrol.types';

const BLANK_FORM = { name: '', method: 'QR' as 'QR' | 'NFC', towerId: '', nfcTagUid: '' };

export function PatrolCheckpointsTab() {
  const { user } = useAuthStore();
  const { currentSociety } = useSocietyStore();
  const societyId = currentSociety?._id || user?.societyId || '';
  const queryClient = useQueryClient();

  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(BLANK_FORM);
  const [disableTarget, setDisableTarget] = useState<PatrolCheckpoint | null>(null);

  const { data: checkpoints, isLoading } = useQuery({
    queryKey: ['patrol-checkpoints', societyId],
    queryFn: () => extractData<PatrolCheckpoint[]>(api.get('/guard-patrol/checkpoints', { params: { societyId } })),
    enabled: !!societyId,
  });

  const { data: towers } = useQuery({
    queryKey: ['towers', societyId],
    queryFn: () => extractData<Tower[]>(api.get(`/towers/society/${societyId}`)),
    enabled: !!societyId,
  });

  const createMutation = useMutation({
    mutationFn: () => api.post('/guard-patrol/checkpoints', { ...form, societyId, towerId: form.towerId || undefined }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patrol-checkpoints'] });
      setShowModal(false);
      setForm(BLANK_FORM);
      toast.success('Checkpoint created');
    },
    onError: (err: any) => toast.error(err?.response?.data?.error?.message || 'Failed to create checkpoint'),
  });

  const disableMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/guard-patrol/checkpoints/${id}/disable`, {}, { params: { societyId } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patrol-checkpoints'] });
      setDisableTarget(null);
      toast.success('Checkpoint disabled');
    },
  });

  const downloadSticker = async (checkpoint: PatrolCheckpoint) => {
    const res = await api.get(`/guard-patrol/checkpoints/${checkpoint._id}/sticker`, { params: { societyId }, responseType: 'blob' });
    const url = URL.createObjectURL(res.data);
    const link = document.createElement('a');
    link.href = url;
    link.download = `patrol-checkpoint-${checkpoint.name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.svg`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">Checkpoints a guard scans (QR) or taps (NFC) during a round.</p>
        <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2"><Plus className="w-4 h-4" /> Add Checkpoint</button>
      </div>

      {isLoading ? (
        <div className="card p-8 text-center text-slate-400">Loading...</div>
      ) : !checkpoints?.length ? (
        <EmptyState icon={QrCode} title="No checkpoints yet" description="Add your first patrol checkpoint to start building a route." action={<button onClick={() => setShowModal(true)} className="btn-primary">Add Checkpoint</button>} />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {checkpoints.map((c) => (
            <div key={c._id} className="card p-4 space-y-2">
              <div className="flex items-center justify-between">
                <p className="font-semibold text-slate-800 text-sm">{c.name}</p>
                <span className={`badge text-xs ${c.method === 'QR' ? 'badge-blue' : 'badge-purple'}`}>
                  {c.method === 'QR' ? <QrCode className="w-3 h-3 inline mr-1" /> : <Nfc className="w-3 h-3 inline mr-1" />}
                  {c.method}
                </span>
              </div>
              {typeof c.towerId === 'object' && c.towerId && <p className="text-xs text-slate-500">{c.towerId.name}</p>}
              <div className="flex items-center gap-2 pt-1">
                {c.method === 'QR' && (
                  <button onClick={() => downloadSticker(c)} className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5"><Download className="w-3.5 h-3.5" /> Download QR</button>
                )}
                <button onClick={() => setDisableTarget(c)} className="p-1.5 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600" title="Disable"><Ban className="w-3.5 h-3.5" /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Add Checkpoint">
        <div className="space-y-4">
          <div><label className="label">Name <span className="text-red-500">*</span></label>
            <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className="input" placeholder="Main Gate" /></div>
          <div><label className="label">Method</label>
            <select value={form.method} onChange={(e) => setForm((f) => ({ ...f, method: e.target.value as 'QR' | 'NFC' }))} className="input">
              <option value="QR">QR Code (printed sticker)</option>
              <option value="NFC">NFC Tag</option>
            </select></div>
          {form.method === 'NFC' && (
            <div><label className="label">NFC Tag UID <span className="text-red-500">*</span></label>
              <input value={form.nfcTagUid} onChange={(e) => setForm((f) => ({ ...f, nfcTagUid: e.target.value }))} className="input" placeholder="Tag's own UID" />
              <p className="mt-1 text-xs text-slate-400">NFC scanning support is coming in a later update — this registers the tag now so routes can be built.</p>
            </div>
          )}
          <div><label className="label">Block <span className="text-slate-400 font-normal">(optional)</span></label>
            <select value={form.towerId} onChange={(e) => setForm((f) => ({ ...f, towerId: e.target.value }))} className="input">
              <option value="">Not linked to a block</option>
              {towers?.map((t) => <option key={t._id} value={t._id}>{t.name}</option>)}
            </select></div>
          <div className="flex gap-3 pt-2">
            <button onClick={() => createMutation.mutate()} disabled={createMutation.isPending || !form.name || (form.method === 'NFC' && !form.nfcTagUid)} className="btn-primary flex-1">
              {createMutation.isPending ? 'Creating...' : 'Create Checkpoint'}
            </button>
            <button onClick={() => setShowModal(false)} className="btn-secondary">Cancel</button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={!!disableTarget}
        title={`Disable ${disableTarget?.name}?`}
        message="Any route using this checkpoint will need to be updated."
        confirmLabel="Disable"
        danger
        isPending={disableMutation.isPending}
        onConfirm={() => disableTarget && disableMutation.mutate(disableTarget._id)}
        onCancel={() => setDisableTarget(null)}
      />
    </div>
  );
}
