import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ClipboardList, Filter } from 'lucide-react';
import { api, extractData } from '../../services/api';
import { PageHeader } from '../../components/common/PageHeader';
import { EmptyState } from '../../components/common/EmptyState';
import { TableSkeleton } from '../../components/common/LoadingSkeleton';
import { useAuthStore } from '../../store/authStore';
import { useSocietyStore } from '../../store/societyStore';
import { AuditLog } from '../../types';
import { formatDateTime } from '../../utils/cn';
import { cn } from '../../utils/cn';

const ACTION_COLORS: Record<string, string> = { CREATE: 'badge-green', UPDATE: 'badge-blue', DELETE: 'badge-red', DISABLE: 'badge-red', ENABLE: 'badge-green', LOGIN: 'badge-purple', LOGOUT: 'badge-gray', MODULE_ENABLED: 'badge-green', MODULE_DISABLED: 'badge-yellow', PAYMENT_CREATED: 'badge-blue', RECEIPT_GENERATED: 'badge-green', DEVICE_MAPPED: 'badge-purple' };

export function AuditPage() {
  const { user } = useAuthStore();
  const { currentSociety } = useSocietyStore();
  const societyId = currentSociety?._id || user?.societyId;
  const [page, setPage] = useState(1);
  const [filterModule, setFilterModule] = useState('');
  const [filterAction, setFilterAction] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['audit', societyId, page, filterModule, filterAction],
    queryFn: () => {
      const params = new URLSearchParams({ page: String(page), limit: '30' });
      if (filterModule) params.set('moduleCode', filterModule);
      if (filterAction) params.set('action', filterAction);
      const url = societyId ? `/audit/society/${societyId}?${params}` : `/audit?${params}`;
      return extractData<any>(api.get(url));
    },
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Audit Logs" subtitle="Complete audit trail of all platform actions" />

      <div className="card p-4">
        <div className="flex gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <select value={filterModule} onChange={(e) => { setFilterModule(e.target.value); setPage(1); }} className="input py-2 text-sm">
              <option value="">All Modules</option>
              {['CORE','PARKING','VISITOR','MAINTENANCE'].map((m) => <option key={m}>{m}</option>)}
            </select>
          </div>
          <select value={filterAction} onChange={(e) => { setFilterAction(e.target.value); setPage(1); }} className="input py-2 text-sm">
            <option value="">All Actions</option>
            {['CREATE','UPDATE','DELETE','LOGIN','LOGOUT','MODULE_ENABLED','MODULE_DISABLED','PAYMENT_CREATED','RECEIPT_GENERATED'].map((a) => <option key={a}>{a}</option>)}
          </select>
        </div>
      </div>

      {isLoading ? <TableSkeleton rows={8} cols={5} /> : (
        <div className="card overflow-hidden">
          {!data?.items?.length ? (
            <EmptyState icon={ClipboardList} title="No audit logs" description="Actions will be logged here" />
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead><tr className="border-b border-slate-100">
                    <th className="table-header text-left">Action</th>
                    <th className="table-header text-left">Entity</th>
                    <th className="table-header text-left">Actor</th>
                    <th className="table-header text-left">Module</th>
                    <th className="table-header text-left">Time</th>
                  </tr></thead>
                  <tbody className="divide-y divide-slate-50">
                    {data.items.map((log: AuditLog) => (
                      <tr key={log._id} className="table-row">
                        <td className="table-cell"><span className={cn('badge', ACTION_COLORS[log.action] || 'badge-gray')}>{log.action}</span></td>
                        <td className="table-cell"><p className="text-sm font-medium text-slate-700">{log.entityType}</p>{log.entityId && <p className="text-xs text-slate-400 font-mono">{log.entityId.substring(0, 8)}...</p>}</td>
                        <td className="table-cell"><p className="text-xs text-slate-700">{(log.actorUserId as any)?.name || log.actorUserId}</p><p className="text-xs text-slate-400">{log.actorRole}</p></td>
                        <td className="table-cell"><span className="badge badge-gray text-xs">{log.moduleCode}</span></td>
                        <td className="table-cell text-xs text-slate-500">{formatDateTime(log.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {data.totalPages > 1 && (
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
