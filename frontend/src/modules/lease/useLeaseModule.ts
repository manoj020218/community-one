import { useQuery } from '@tanstack/react-query';
import { api, extractData } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { useSocietyStore } from '../../store/societyStore';
import { Module } from '../../types';

/** Self-contained LEASE module-enablement check — same pattern as useSamaModule/useMcrModule, kept independent on purpose. */
export function useLeaseModule() {
  const { user } = useAuthStore();
  const { currentSociety } = useSocietyStore();
  const societyId = currentSociety?._id || user?.societyId;
  const canReadModules = !!user?.permissions?.includes('module.read');

  const query = useQuery({
    queryKey: ['modules', societyId],
    queryFn: () => extractData<Module[]>(api.get(`/modules/society/${societyId}`)),
    enabled: !!societyId && canReadModules,
  });

  const module = query.data?.find((item) => item.code === 'LEASE');
  return { ...query, module, isEnabled: !!module?.isEnabled };
}
