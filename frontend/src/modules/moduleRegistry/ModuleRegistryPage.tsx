import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Puzzle, CheckCircle2, Clock, ToggleLeft, ToggleRight } from 'lucide-react';
import { api, extractData } from '../../services/api';
import { PageHeader } from '../../components/common/PageHeader';
import { useAuthStore } from '../../store/authStore';
import { useSocietyStore } from '../../store/societyStore';
import toast from 'react-hot-toast';
import { cn } from '../../utils/cn';

export function ModuleRegistryPage() {
  const { user } = useAuthStore();
  const { currentSociety } = useSocietyStore();
  const queryClient = useQueryClient();
  const societyId = currentSociety?._id || user?.societyId;

  const { data: modules = [] } = useQuery({
    queryKey: ['modules', societyId],
    queryFn: () => societyId ? extractData<any[]>(api.get(`/modules/society/${societyId}`)) : extractData<any[]>(api.get('/modules')),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ moduleCode, enable }: { moduleCode: string; enable: boolean }) => {
      if (!societyId) throw new Error('No society selected');
      const url = `/modules/society/${societyId}/${enable ? 'enable' : 'disable'}/${moduleCode}`;
      return api.post(url);
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['modules'] });
      toast.success(`Module ${vars.enable ? 'enabled' : 'disabled'}`);
    },
  });

  const isSuperAdmin = user?.roleCode === 'JENIX_SUPER_ADMIN';

  return (
    <div className="space-y-6">
      <PageHeader title="Module Registry" subtitle="View and manage platform modules" />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {modules.map((module: any) => (
          <div key={module.code} className={cn('card p-5 transition-all', module.code === 'CORE' ? 'border-primary-200' : '')}>
            <div className="flex items-start justify-between mb-3">
              <div className={cn('w-10 h-10 rounded-2xl flex items-center justify-center', module.isEnabled || module.code === 'CORE' ? 'bg-primary-100' : 'bg-slate-100')}>
                <Puzzle className={cn('w-5 h-5', module.isEnabled || module.code === 'CORE' ? 'text-primary-600' : 'text-slate-400')} />
              </div>
              <div className="flex items-center gap-2">
                {module.code === 'CORE' ? (
                  <span className="badge badge-green">Core</span>
                ) : module.status === 'COMING_SOON' ? (
                  <span className="badge badge-gray flex items-center gap-1"><Clock className="w-3 h-3" />Coming</span>
                ) : module.isEnabled ? (
                  <span className="badge badge-green flex items-center gap-1"><CheckCircle2 className="w-3 h-3" />Active</span>
                ) : (
                  <span className="badge badge-gray">Disabled</span>
                )}
              </div>
            </div>

            <h3 className="font-semibold text-slate-800 text-sm mb-1">{module.name}</h3>
            <p className="text-xs text-slate-500 mb-4 leading-relaxed">{module.description}</p>

            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400">v{module.version}</span>
              {societyId && module.code !== 'CORE' && module.status !== 'COMING_SOON' && (
                <button onClick={() => toggleMutation.mutate({ moduleCode: module.code, enable: !module.isEnabled })}
                  disabled={toggleMutation.isPending} className="text-slate-400 hover:text-primary-600 transition-colors">
                  {module.isEnabled ? <ToggleRight className="w-6 h-6 text-primary-600" /> : <ToggleLeft className="w-6 h-6" />}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
