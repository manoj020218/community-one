import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus, Search, Building2, MapPin, Phone, Edit2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api, extractData } from '../../services/api';
import { PageHeader } from '../../components/common/PageHeader';
import { EmptyState } from '../../components/common/EmptyState';
import { TableSkeleton } from '../../components/common/LoadingSkeleton';
import { Society } from '../../types';

export function SocietyListPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ['societies', page, search],
    queryFn: () => extractData<any>(api.get(`/societies?page=${page}&limit=20${search ? `&search=${search}` : ''}`)),
  });

  const societies: Society[] = data?.items || [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Societies"
        subtitle="Manage all registered societies on the platform"
        action={<button onClick={() => navigate('/societies/new')} className="btn-primary flex items-center gap-2"><Plus className="w-4 h-4" /> New Society</button>}
      />

      {/* Search */}
      <div className="card p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input type="text" placeholder="Search societies by name, city, code..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="input pl-10" />
        </div>
      </div>

      {isLoading ? <TableSkeleton rows={6} cols={5} /> : (
        <div className="card overflow-hidden">
          {societies.length === 0 ? (
            <EmptyState icon={Building2} title="No societies yet" description="Create your first society to get started" action={<button onClick={() => navigate('/societies/new')} className="btn-primary">Create Society</button>} />
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-100">
                      <th className="table-header text-left">Society</th>
                      <th className="table-header text-left">Location</th>
                      <th className="table-header text-left">Contact</th>
                      <th className="table-header text-left">Plan</th>
                      <th className="table-header text-left">Status</th>
                      <th className="table-header text-left">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {societies.map((s) => (
                      <tr key={s._id} className="table-row">
                        <td className="table-cell">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 bg-gradient-to-br from-primary-400 to-purple-500 rounded-xl flex items-center justify-center flex-shrink-0">
                              <Building2 className="w-4 h-4 text-white" />
                            </div>
                            <div>
                              <p className="font-semibold text-slate-800 text-sm">{s.name}</p>
                              <p className="text-xs text-slate-500">{s.code}</p>
                            </div>
                          </div>
                        </td>
                        <td className="table-cell">
                          <div className="flex items-center gap-1.5 text-slate-600">
                            <MapPin className="w-3 h-3 text-slate-400" />
                            <span className="text-xs">{s.city}, {s.state}</span>
                          </div>
                        </td>
                        <td className="table-cell">
                          <div>
                            <p className="text-sm text-slate-700">{s.contactPersonName}</p>
                            <div className="flex items-center gap-1 text-xs text-slate-500"><Phone className="w-3 h-3" /> {s.contactMobile}</div>
                          </div>
                        </td>
                        <td className="table-cell"><span className="badge badge-blue">{s.planCode}</span></td>
                        <td className="table-cell">
                          <span className={`badge ${s.status === 'ACTIVE' ? 'badge-green' : s.status === 'ONBOARDING' ? 'badge-yellow' : 'badge-gray'}`}>{s.status}</span>
                        </td>
                        <td className="table-cell">
                          <div className="flex items-center gap-2">
                            <button onClick={() => navigate(`/societies/${s._id}/edit`)} className="p-2 rounded-lg hover:bg-primary-50 text-slate-400 hover:text-primary-600 transition-colors">
                              <Edit2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {/* Pagination */}
              {data?.totalPages > 1 && (
                <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100">
                  <p className="text-sm text-slate-500">Page {page} of {data.totalPages} ({data.total} total)</p>
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
