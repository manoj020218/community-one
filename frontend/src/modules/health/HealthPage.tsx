import { useQuery } from '@tanstack/react-query';
import { Activity, Database, CheckCircle2, XCircle, Clock, Wifi, Server, Cpu } from 'lucide-react';
import axios from 'axios';
import { PageHeader } from '../../components/common/PageHeader';
import { StatCard } from '../../components/common/StatCard';
import { cn } from '../../utils/cn';

export function HealthPage() {
  const { data: health, isLoading, dataUpdatedAt } = useQuery({
    queryKey: ['health'],
    queryFn: async () => {
      const res = await axios.get('/health');
      return res.data.data;
    },
    refetchInterval: 30000,
  });

  const isHealthy = health?.databaseStatus === 'connected';

  return (
    <div className="space-y-6">
      <PageHeader title="System Health" subtitle="Monitor platform and device status in real-time" />

      {isLoading ? (
        <div className="card p-8 text-center text-slate-400">Loading health data...</div>
      ) : (
        <>
          {/* Overall Status */}
          <div className={cn('card p-6 flex items-center gap-4', isHealthy ? 'border-emerald-200 bg-emerald-50/30' : 'border-red-200 bg-red-50/30')}>
            <div className={cn('w-14 h-14 rounded-2xl flex items-center justify-center', isHealthy ? 'bg-emerald-100' : 'bg-red-100')}>
              {isHealthy ? <CheckCircle2 className="w-7 h-7 text-emerald-600" /> : <XCircle className="w-7 h-7 text-red-600" />}
            </div>
            <div>
              <h2 className={cn('text-xl font-bold', isHealthy ? 'text-emerald-800' : 'text-red-800')}>
                {isHealthy ? 'System Healthy' : 'System Degraded'}
              </h2>
              <p className="text-sm text-slate-600 mt-0.5">
                Last checked: {dataUpdatedAt ? new Date(dataUpdatedAt).toLocaleTimeString() : 'Never'}
              </p>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard title="API Status" value={health?.apiStatus || 'unknown'} icon={Server} color={health?.apiStatus === 'running' ? 'green' : 'red'} />
            <StatCard title="Database" value={health?.databaseStatus || 'unknown'} icon={Database} color={health?.databaseStatus === 'connected' ? 'green' : 'red'} />
            <StatCard title="Uptime" value={`${Math.floor((health?.uptime || 0) / 3600)}h ${Math.floor(((health?.uptime || 0) % 3600) / 60)}m`} icon={Clock} color="blue" />
            <StatCard title="Version" value={health?.version || 'v1.0.0'} icon={Activity} color="purple" />
          </div>

          {/* Services Status */}
          <div className="card">
            <div className="px-6 py-4 border-b border-slate-100">
              <h3 className="section-title">Service Status</h3>
            </div>
            <div className="divide-y divide-slate-50">
              {[
                { name: 'REST API', status: health?.apiStatus === 'running' ? 'operational' : 'down', icon: Server },
                { name: 'MongoDB Database', status: health?.databaseStatus === 'connected' ? 'operational' : 'down', icon: Database },
                { name: 'MQTT Broker', status: health?.mqttStatus || 'not_configured', icon: Wifi },
                { name: 'FCM Push Service', status: health?.fcmStatus || 'not_configured', icon: Cpu },
                { name: 'File Storage', status: 'operational', icon: Activity },
              ].map((service) => (
                <div key={service.name} className="flex items-center justify-between px-6 py-4">
                  <div className="flex items-center gap-3">
                    <service.icon className="w-5 h-5 text-slate-400" />
                    <span className="font-medium text-slate-700 text-sm">{service.name}</span>
                  </div>
                  <span className={cn('badge', service.status === 'operational' ? 'badge-green' : service.status === 'down' ? 'badge-red' : 'badge-gray')}>
                    {service.status.replace(/_/g, ' ')}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="card p-4 text-center text-xs text-slate-400">
            Environment: {health?.environment} | Auto-refreshes every 30 seconds
          </div>
        </>
      )}
    </div>
  );
}
