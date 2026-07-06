import { useQuery } from '@tanstack/react-query';
import { Building2, Users, Cpu, CheckCircle2, Clock, TrendingUp, Plus, ArrowRight, Activity } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api, extractData } from '../../services/api';
import { StatCard } from '../../components/common/StatCard';
import { CardSkeleton } from '../../components/common/LoadingSkeleton';
import { formatDate } from '../../utils/cn';

export function SuperAdminDashboard() {
  const navigate = useNavigate();

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['society-stats'],
    queryFn: () => extractData<{ total: number; active: number; onboarding: number }>(api.get('/societies/stats')),
  });

  const { data: societies } = useQuery({
    queryKey: ['recent-societies'],
    queryFn: () => extractData<any>(api.get('/societies?limit=5')),
  });

  if (statsLoading) return <div className="space-y-6"><CardSkeleton count={4} /></div>;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Welcome Banner */}
      <div className="relative bg-gradient-to-r from-primary-600 via-primary-700 to-purple-700 rounded-3xl p-6 overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-full opacity-10">
          <Building2 className="w-full h-full text-white" />
        </div>
        <div className="relative">
          <p className="text-primary-200 text-sm font-medium mb-1">Jenix Super Admin</p>
          <h1 className="text-2xl font-bold text-white mb-2">Platform Overview</h1>
          <p className="text-primary-200 text-sm">Manage all societies from this central dashboard</p>
          <div className="flex items-center gap-3 mt-4">
            <button onClick={() => navigate('/societies/new')} className="flex items-center gap-2 bg-white text-primary-700 px-4 py-2 rounded-xl text-sm font-semibold hover:bg-primary-50 transition-colors">
              <Plus className="w-4 h-4" /> New Society
            </button>
            <button onClick={() => navigate('/health')} className="flex items-center gap-2 bg-white/20 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-white/30 transition-colors border border-white/30">
              <Activity className="w-4 h-4" /> System Health
            </button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Societies" value={stats?.total || 0} icon={Building2} color="indigo" />
        <StatCard title="Active Societies" value={stats?.active || 0} icon={CheckCircle2} color="green" />
        <StatCard title="Onboarding" value={stats?.onboarding || 0} icon={Clock} color="amber" />
        <StatCard title="Platform Revenue" value="₹0" icon={TrendingUp} color="purple" />
      </div>

      {/* Recent Societies */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
            <h3 className="section-title">Recent Societies</h3>
            <button onClick={() => navigate('/societies')} className="text-sm text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1">
              View all <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          <div className="divide-y divide-slate-50">
            {societies?.items?.slice(0, 5).map((s: any) => (
              <div key={s._id} className="flex items-center gap-4 px-6 py-4 hover:bg-slate-50 transition-colors cursor-pointer" onClick={() => navigate(`/societies/${s._id}/edit`)}>
                <div className="w-10 h-10 bg-gradient-to-br from-primary-400 to-purple-400 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Building2 className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-800 text-sm truncate">{s.name}</p>
                  <p className="text-xs text-slate-500">{s.city}, {s.state}</p>
                </div>
                <span className={`badge ${s.status === 'ACTIVE' ? 'badge-green' : s.status === 'ONBOARDING' ? 'badge-yellow' : 'badge-gray'}`}>{s.status}</span>
              </div>
            ))}
            {(!societies?.items?.length) && (
              <div className="px-6 py-8 text-center text-slate-500 text-sm">
                No societies yet. <button onClick={() => navigate('/societies/new')} className="text-primary-600 font-medium">Create one</button>
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="card">
          <div className="px-6 py-4 border-b border-slate-100">
            <h3 className="section-title">Quick Actions</h3>
          </div>
          <div className="p-6 grid grid-cols-2 gap-3">
            {[
              { icon: Building2, label: 'Add Society', to: '/societies/new', color: 'bg-indigo-50 text-indigo-600' },
              { icon: Users, label: 'View Residents', to: '/residents', color: 'bg-emerald-50 text-emerald-600' },
              { icon: Cpu, label: 'Manage Devices', to: '/devices', color: 'bg-amber-50 text-amber-600' },
              { icon: Activity, label: 'Health Status', to: '/health', color: 'bg-purple-50 text-purple-600' },
            ].map((action) => (
              <button key={action.to} onClick={() => navigate(action.to)}
                className="flex flex-col items-center gap-2 p-4 rounded-2xl border border-slate-100 hover:border-primary-200 hover:shadow-card-hover transition-all">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${action.color}`}>
                  <action.icon className="w-5 h-5" />
                </div>
                <span className="text-sm font-medium text-slate-700">{action.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
