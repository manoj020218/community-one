import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Upload, File, Image, FileText, Trash2 } from 'lucide-react';
import { api, extractData } from '../../services/api';
import { PageHeader } from '../../components/common/PageHeader';
import { EmptyState } from '../../components/common/EmptyState';
import { TableSkeleton } from '../../components/common/LoadingSkeleton';
import { useAuthStore } from '../../store/authStore';
import { useSocietyStore } from '../../store/societyStore';
import { formatDate } from '../../utils/cn';
import toast from 'react-hot-toast';

const MIME_ICONS: Record<string, any> = { 'image/': Image, 'application/pdf': FileText };
function fileIcon(mime: string) { for (const [k, I] of Object.entries(MIME_ICONS)) if (mime.startsWith(k)) return I; return File; }
function formatSize(bytes: number) { if (bytes < 1024) return `${bytes} B`; if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`; return `${(bytes / (1024 * 1024)).toFixed(1)} MB`; }

export function FilesPage() {
  const { user } = useAuthStore();
  const { currentSociety } = useSocietyStore();
  const societyId = currentSociety?._id || user?.societyId || '';
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['files', societyId, page],
    queryFn: () => extractData<any>(api.get(`/files/society/${societyId}?page=${page}&limit=20`)),
    enabled: !!societyId,
  });

  const uploadMutation = useMutation({
    mutationFn: (file: File) => { const fd = new FormData(); fd.append('file', file); fd.append('societyId', societyId); return api.post('/files/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } }); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['files'] }); toast.success('File uploaded!'); },
    onError: () => toast.error('Upload failed'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/files/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['files'] }); toast.success('File deleted'); },
  });

  const handleFiles = (files: FileList | null) => { if (files?.[0]) uploadMutation.mutate(files[0]); };

  const assets: any[] = data?.items || [];

  return (
    <div className="space-y-6">
      <PageHeader title="File Assets" subtitle="Upload and manage documents and images" />

      <div
        className={`card p-8 border-2 border-dashed transition-colors cursor-pointer text-center ${dragging ? 'border-indigo-400 bg-indigo-50' : 'border-slate-200 hover:border-indigo-300'}`}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); handleFiles(e.dataTransfer.files); }}
        onClick={() => inputRef.current?.click()}
      >
        <input ref={inputRef} type="file" className="hidden" accept="image/*,application/pdf,.doc,.docx" onChange={(e) => handleFiles(e.target.files)} />
        <Upload className={`w-10 h-10 mx-auto mb-3 ${dragging ? 'text-indigo-500' : 'text-slate-300'}`} />
        <p className="text-sm font-medium text-slate-600">{uploadMutation.isPending ? 'Uploading...' : 'Drop file here or click to browse'}</p>
        <p className="text-xs text-slate-400 mt-1">Images, PDF, Word — up to 10 MB</p>
      </div>

      {isLoading ? <TableSkeleton rows={5} cols={4} /> : (
        <div className="card overflow-hidden">
          {assets.length === 0 ? (
            <EmptyState icon={File} title="No files yet" description="Upload documents or images above" />
          ) : (
            <>
              <div className="divide-y divide-slate-50">
                {assets.map((asset: any) => {
                  const Icon = fileIcon(asset.mimeType || '');
                  return (
                    <div key={asset._id} className="flex items-center gap-4 px-6 py-3 hover:bg-slate-50">
                      <div className="w-9 h-9 bg-slate-100 rounded-lg flex items-center justify-center flex-shrink-0"><Icon className="w-4 h-4 text-slate-500" /></div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-800 truncate">{asset.originalName}</p>
                        <p className="text-xs text-slate-400">{formatSize(asset.sizeBytes || 0)} · {formatDate(asset.createdAt)}</p>
                      </div>
                      {asset.url && <a href={asset.url} target="_blank" rel="noreferrer" className="text-xs text-indigo-600 hover:underline flex-shrink-0">View</a>}
                      <button onClick={() => deleteMutation.mutate(asset._id)} className="p-1.5 text-slate-400 hover:text-red-500 rounded transition-colors flex-shrink-0"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  );
                })}
              </div>
              {data?.totalPages > 1 && (
                <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100">
                  <p className="text-sm text-slate-500">Page {page} of {data.totalPages}</p>
                  <div className="flex gap-2">
                    <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="btn-secondary text-sm py-1.5 px-3 disabled:opacity-50">Prev</button>
                    <button disabled={page >= data.totalPages} onClick={() => setPage(p => p + 1)} className="btn-secondary text-sm py-1.5 px-3 disabled:opacity-50">Next</button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
