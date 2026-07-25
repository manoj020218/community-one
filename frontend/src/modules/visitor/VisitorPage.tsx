import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api, extractData } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { useSocietyStore } from '../../store/societyStore';
import { hasPermission } from '../../utils/permissions';
import { EmptyState } from '../../components/common/EmptyState';
import { ShieldCheck } from 'lucide-react';
import { VisitorContext } from './types';
import { withSocietyQuery } from './visitorApi';
import { useVisitorRealtime } from './useVisitorRealtime';
import { GuardVisitorView } from './GuardVisitorView';
import { ResidentVisitorView } from './ResidentVisitorView';
import { AdminVisitorView } from './AdminVisitorView';

export function VisitorPage() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const { currentSociety } = useSocietyStore();
  const societyId = currentSociety?._id || user?.societyId;

  const { data: context } = useQuery({
    queryKey: ['visitor-context', societyId],
    queryFn: () => extractData<VisitorContext>(api.get(withSocietyQuery('/visitor/context', societyId))),
    enabled: !!societyId,
  });

  const { transport } = useVisitorRealtime({
    enabled: !!societyId,
    societyId,
    onEvent: () => {
      queryClient.invalidateQueries({ queryKey: ['visitor-summary'] });
      queryClient.invalidateQueries({ queryKey: ['visitor-admin-requests'] });
      queryClient.invalidateQueries({ queryKey: ['visitor-resident-requests'] });
      queryClient.invalidateQueries({ queryKey: ['visitor-flats'] });
      queryClient.invalidateQueries({ queryKey: ['visitor-requests-pending'] });
    },
  });

  if (!user || !context) return null;
  const pollingMs = 15000;

  if (hasPermission(user, 'visitor.request.create')) return <GuardVisitorView societyId={societyId!} transport={transport} pollingMs={pollingMs} />;
  if (hasPermission(user, 'visitor.request.respond_own_flat')) return <ResidentVisitorView societyId={societyId!} transport={transport} pollingMs={pollingMs} />;
  if (hasPermission(user, 'visitor.report.view') || hasPermission(user, 'visitor.request.view_society')) return <AdminVisitorView societyId={societyId!} transport={transport} pollingMs={pollingMs} />;

  return <EmptyState icon={ShieldCheck} title="Visitor access unavailable" description="Your current role does not have Visitor Management permissions." />;
}
