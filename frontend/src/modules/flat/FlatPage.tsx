import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { LayoutGrid, Search } from 'lucide-react';
import { api, extractData } from '../../services/api';
import { PageHeader } from '../../components/common/PageHeader';
import { EmptyState } from '../../components/common/EmptyState';
import { TableSkeleton } from '../../components/common/LoadingSkeleton';
import { useAuthStore } from '../../store/authStore';
import { useSocietyStore } from '../../store/societyStore';
import { Flat } from '../../types';
import { cn } from '../../utils/cn';

const occupancyColors: Record<string, string> = { OWNER_OCCUPIED: 'badge-green', TENANT_OCCUPIED: 'badge-blue', VACANT: 'badge-gray', LOCKED: 'badge-yellow', UNDER_RENOVATION: 'badge-red' };

export function FlatPage() {
  const { user } = useAuthStore();
  const { currentSociety } = useSocietyStore();
  const societyId = currentSociety?._id || user?.societyId || '';
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['flats', societyId, page],
    queryFn: () => extractData<any>(api.get(`/flats/society/${societyId}?page=${page}&limit=30`)),
    enabled: !!societyId,
  });

  const flats: Flat[] = data?.items || [];

  return (
    <div className="space-y-6">
      <PageHeader title="Flats & Apartments" subtitle="View all flats in your society" />

      {isLoading ? <TableSkeleton rows={8} cols={5} /> : (
        <div className="card overflow-hidden">
          {flats.length === 0 ? (
            <EmptyState icon={LayoutGrid} title="No flats yet" description="Use the Onboarding Wizard or Tower/Floor management to generate flats" />
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead><tr className="border-b border-slate-100">
                    <th className="table-header text-left">Flat No</th>
                    <th className="table-header text-left">Tower</th>
                    <th className="table-header text-left">Floor</th>
                    <th className="table-header text-left">Type</th>
                    <th className="table-header text-left">Area (sqft)</th>
                    <th className="table-header text-left">Occupancy</th>
                  </tr></thead>
                  <tbody className="divide-y divide-slate-50">
                    {flats.map((f) => (
                      <tr key={f._id} className="table-row">
                        <td className="table-cell font-mono font-semibold text-slate-800">{f.flatNo}</td>
                        <td className="table-cell text-sm text-slate-600">{(f.towerId as any)?.name || 'N/A'}</td>
                        <td className="table-cell text-sm text-slate-600">{(f.floorId as any)?.floorName || 'N/A'}</td>
                        <td className="table-cell"><span className="badge badge-blue">{f.flatType}</span></td>
                        <td className="table-cell text-slate-600">{f.areaSqFt || '—'}</td>
                        <td className="table-cell"><span className={cn('badge text-xs', occupancyColors[f.occupancyStatus] || 'badge-gray')}>{f.occupancyStatus.replace(/_/g, ' ')}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {data?.totalPages > 1 && (
                <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100">
                  <p className="text-sm text-slate-500">Page {page} of {data.totalPages} ({data.total} flats)</p>
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
