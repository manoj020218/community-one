import { useQuery } from '@tanstack/react-query';
import { api, extractData } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { useSocietyStore } from '../../store/societyStore';
import { Module } from '../../types';

export function useSocietyModules() {
  const { user } = useAuthStore();
  const { currentSociety } = useSocietyStore();
  const societyId = currentSociety?._id || user?.societyId;
  const canReadModules = !!user?.permissions?.includes('module.read');

  return useQuery({
    queryKey: ['modules', societyId],
    queryFn: () => extractData<Module[]>(api.get(`/modules/society/${societyId}`)),
    enabled: !!societyId && canReadModules,
  });
}

export function useSocietyModule(code: string) {
  const query = useSocietyModules();
  const module = query.data?.find((item) => item.code === code);
  return { ...query, module, isEnabled: !!module?.isEnabled };
}
