import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell, CheckCheck, Info, AlertTriangle, Zap, CreditCard, Cpu, Settings } from 'lucide-react';
import { api, extractData } from '../../services/api';
import { PageHeader } from '../../components/common/PageHeader';
import { EmptyState } from '../../components/common/EmptyState';
import { Notification } from '../../types';
import { formatDateTime } from '../../utils/cn';
import { cn } from '../../utils/cn';

const typeConfig: Record<string, { icon: any; color: string }> = {
  INFO: { icon: Info, color: 'text-blue-600 bg-blue-50' },
  WARNING: { icon: AlertTriangle, color: 'text-amber-600 bg-amber-50' },
  URGENT: { icon: Zap, color: 'text-red-600 bg-red-50' },
  PAYMENT: { icon: CreditCard, color: 'text-emerald-600 bg-emerald-50' },
  DEVICE: { icon: Cpu, color: 'text-purple-600 bg-purple-50' },
  SYSTEM: { icon: Settings, color: 'text-slate-600 bg-slate-100' },
};

export function NotificationPage() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => extractData<any>(api.get('/notifications?limit=50')),
  });

  const markAllMutation = useMutation({
    mutationFn: () => api.patch('/notifications/mark-all-read'),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const markReadMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/notifications/${id}/read`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const notifications: Notification[] = data?.items || [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notifications"
        subtitle="Stay updated with all platform activity"
        action={notifications.some((n) => !n.readAt) ? (
          <button onClick={() => markAllMutation.mutate()} className="btn-secondary flex items-center gap-2 text-sm">
            <CheckCheck className="w-4 h-4" /> Mark All Read
          </button>
        ) : undefined}
      />

      <div className="card divide-y divide-slate-50">
        {isLoading && <div className="p-8 text-center text-slate-400 text-sm">Loading...</div>}
        {!isLoading && notifications.length === 0 && (
          <EmptyState icon={Bell} title="No notifications" description="You're all caught up! Check back later for updates." />
        )}
        {notifications.map((notif) => {
          const type = typeConfig[notif.type] || typeConfig.INFO;
          const Icon = type.icon;
          return (
            <div key={notif._id}
              className={cn('flex items-start gap-4 px-6 py-4 cursor-pointer hover:bg-slate-50 transition-colors', !notif.readAt ? 'bg-primary-50/30' : '')}
              onClick={() => { if (!notif.readAt) markReadMutation.mutate(notif._id); }}>
              <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5', type.color)}>
                <Icon className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <p className={cn('text-sm font-semibold', !notif.readAt ? 'text-slate-900' : 'text-slate-700')}>{notif.title}</p>
                  {!notif.readAt && <span className="w-2 h-2 bg-primary-500 rounded-full flex-shrink-0 mt-1.5" />}
                </div>
                <p className="text-sm text-slate-500 mt-0.5 leading-relaxed">{notif.message}</p>
                <p className="text-xs text-slate-400 mt-1">{formatDateTime(notif.createdAt)}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
