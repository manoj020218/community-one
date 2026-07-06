import { useQuery } from '@tanstack/react-query';
import { Shield, CheckCircle2 } from 'lucide-react';
import { api, extractData } from '../../services/api';
import { PageHeader } from '../../components/common/PageHeader';
import { EmptyState } from '../../components/common/EmptyState';
import { TableSkeleton } from '../../components/common/LoadingSkeleton';
import { Role } from '../../types';

export function RolesPage() {
  const { data: roles = [], isLoading } = useQuery({
    queryKey: ['roles'],
    queryFn: () => extractData<Role[]>(api.get('/roles')),
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Roles & Permissions" subtitle="View system roles and their permission sets" />

      {isLoading ? <TableSkeleton rows={6} cols={3} /> : (
        roles.length === 0 ? (
          <div className="card"><EmptyState icon={Shield} title="No roles found" description="System roles are seeded automatically on startup" /></div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {roles.map((role) => (
              <div key={role._id} className="card p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center"><Shield className="w-5 h-5" /></div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-slate-800 text-sm">{role.name}</h3>
                      {role.isSystemRole && <span className="badge badge-purple text-xs">System</span>}
                    </div>
                    <p className="text-xs text-slate-500 font-mono mt-0.5">{role.code}</p>
                  </div>
                  <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">{role.permissions.length} perms</span>
                </div>
                <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
                  {role.permissions.slice(0, 20).map((perm) => (
                    <span key={perm} className="inline-flex items-center gap-1 text-xs bg-slate-50 text-slate-600 px-2 py-0.5 rounded border border-slate-100">
                      <CheckCircle2 className="w-2.5 h-2.5 text-green-500" />{perm}
                    </span>
                  ))}
                  {role.permissions.length > 20 && (
                    <span className="text-xs text-slate-400 px-2 py-0.5">+{role.permissions.length - 20} more</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
}
