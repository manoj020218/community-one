import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Megaphone, Ban } from 'lucide-react';
import toast from 'react-hot-toast';
import { api, extractData } from '../../services/api';
import { PageHeader } from '../../components/common/PageHeader';
import { Modal } from '../../components/common/Modal';
import { EmptyState } from '../../components/common/EmptyState';
import { cn } from '../../utils/cn';

type BannerType = 'UPDATE' | 'ANNOUNCEMENT' | 'OTHER';

interface Banner {
  _id: string;
  title?: string;
  message: string;
  imageUrl?: string;
  linkUrl?: string;
  linkLabel?: string;
  bannerType: BannerType;
  isActive: boolean;
  createdAt: string;
}

const BLANK_FORM = { title: '', message: '', imageUrl: '', linkUrl: '', linkLabel: '', bannerType: 'ANNOUNCEMENT' as BannerType };

const TYPE_LABELS: Record<BannerType, string> = { UPDATE: 'App Update', ANNOUNCEMENT: 'Announcement', OTHER: 'Other' };

export function BannerAdminPage() {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(BLANK_FORM);

  const { data: banners, isLoading } = useQuery({
    queryKey: ['banners'],
    queryFn: () => extractData<Banner[]>(api.get('/banners')),
  });

  const resetForm = () => setForm(BLANK_FORM);

  const createMutation = useMutation({
    mutationFn: () => api.post('/banners', form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['banners'] });
      setShowModal(false);
      resetForm();
      toast.success('Banner published!');
    },
    onError: (err: any) => toast.error(err?.response?.data?.error?.message || 'Failed to create banner'),
  });

  const disableMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/banners/${id}/disable`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['banners'] });
      toast.success('Banner disabled');
    },
  });

  const canSubmit = form.message.trim().length > 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="App Banners"
        subtitle="Push a text/image/link banner into every logged-in user's app — use it to announce APK updates (since there's no Play Store auto-update) or general news"
        action={
          <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" /> New Banner
          </button>
        }
      />

      {isLoading ? (
        <div className="card p-8 text-center text-slate-400 text-sm">Loading...</div>
      ) : !banners?.length ? (
        <EmptyState
          icon={Megaphone}
          title="No banners yet"
          description="Publish a banner to notify all users of an app update or announcement."
          action={<button onClick={() => setShowModal(true)} className="btn-primary">New Banner</button>}
        />
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="table-header text-left">Banner</th>
                  <th className="table-header text-left">Type</th>
                  <th className="table-header text-left">Status</th>
                  <th className="table-header text-left">Created</th>
                  <th className="table-header text-left">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {banners.map((b) => (
                  <tr key={b._id} className="table-row">
                    <td className="table-cell">
                      <p className="font-medium text-slate-800 text-sm">{b.title || '—'}</p>
                      <p className="text-xs text-slate-500 max-w-xs truncate">{b.message}</p>
                    </td>
                    <td className="table-cell">
                      <span className="badge badge-gray text-xs">{TYPE_LABELS[b.bannerType]}</span>
                    </td>
                    <td className="table-cell">
                      <span className={cn('badge', b.isActive ? 'badge-green' : 'badge-gray')}>
                        {b.isActive ? 'Active' : 'Disabled'}
                      </span>
                    </td>
                    <td className="table-cell text-xs text-slate-500">
                      {new Date(b.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="table-cell">
                      {b.isActive && (
                        <button
                          onClick={() => disableMutation.mutate(b._id)}
                          className="text-red-600 hover:text-red-700 text-xs font-medium flex items-center gap-1"
                        >
                          <Ban className="w-3.5 h-3.5" /> Disable
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal isOpen={showModal} onClose={() => { setShowModal(false); resetForm(); }} title="New Banner">
        <div className="space-y-4">
          <div>
            <label className="label">Type</label>
            <select value={form.bannerType} onChange={(e) => setForm((f) => ({ ...f, bannerType: e.target.value as BannerType }))} className="input">
              <option value="ANNOUNCEMENT">Announcement</option>
              <option value="UPDATE">App Update</option>
              <option value="OTHER">Other</option>
            </select>
          </div>
          <div>
            <label className="label">Title</label>
            <input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} className="input" placeholder="e.g. New version available" />
          </div>
          <div>
            <label className="label">Message <span className="text-red-500">*</span></label>
            <textarea value={form.message} onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))} className="input" rows={3} placeholder="e.g. Version 1.2 is out with bug fixes — download the latest APK." />
          </div>
          <div>
            <label className="label">Image URL</label>
            <input value={form.imageUrl} onChange={(e) => setForm((f) => ({ ...f, imageUrl: e.target.value }))} className="input" placeholder="https://..." />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Link URL</label>
              <input value={form.linkUrl} onChange={(e) => setForm((f) => ({ ...f, linkUrl: e.target.value }))} className="input" placeholder="/downloads/jenix-community.apk" />
            </div>
            <div>
              <label className="label">Button Label</label>
              <input value={form.linkLabel} onChange={(e) => setForm((f) => ({ ...f, linkLabel: e.target.value }))} className="input" placeholder="Download" />
            </div>
          </div>
          <p className="text-xs text-slate-400">Banners show text, an optional image, and an optional link button — no scripts or embedded HTML are ever executed.</p>

          <div className="flex gap-3 pt-2">
            <button onClick={() => createMutation.mutate()} disabled={createMutation.isPending || !canSubmit} className="btn-primary flex-1">
              {createMutation.isPending ? 'Publishing...' : 'Publish Banner'}
            </button>
            <button onClick={() => { setShowModal(false); resetForm(); }} className="btn-secondary">Cancel</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
