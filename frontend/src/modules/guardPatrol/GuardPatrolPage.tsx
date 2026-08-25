import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Footprints, LayoutDashboard, QrCode, Route as RouteIcon, UserCog, FileBarChart, Settings2 } from 'lucide-react';
import { EmptyState } from '../../components/common/EmptyState';
import { PageHeader } from '../../components/common/PageHeader';
import { useAuthStore } from '../../store/authStore';
import { useGuardPatrolModule } from './useGuardPatrolModule';
import { hasPatrolAccess, hasPatrolAdminAccess, hasPatrolReportsAccess } from './guardPatrol.permissions';
import { PatrolDashboardTab } from './PatrolDashboardTab';
import { PatrolCheckpointsTab } from './PatrolCheckpointsTab';
import { PatrolRoutesTab } from './PatrolRoutesTab';
import { PatrolAssignmentsTab } from './PatrolAssignmentsTab';
import { PatrolReportsTab } from './PatrolReportsTab';
import { PatrolSettingsTab } from './PatrolSettingsTab';

type TabKey = 'dashboard' | 'checkpoints' | 'routes' | 'assignments' | 'reports' | 'settings';

export function GuardPatrolPage() {
  const { user } = useAuthStore();
  const permissions = user?.permissions || [];
  const { module, isEnabled, isLoading } = useGuardPatrolModule();

  const tabs: Array<{ key: TabKey; label: string; icon: typeof Footprints }> = [
    { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    ...(hasPatrolAdminAccess(permissions) ? [{ key: 'checkpoints' as const, label: 'Checkpoints', icon: QrCode }] : []),
    ...(hasPatrolAdminAccess(permissions) ? [{ key: 'routes' as const, label: 'Routes', icon: RouteIcon }] : []),
    ...(hasPatrolAdminAccess(permissions) ? [{ key: 'assignments' as const, label: 'Assignments', icon: UserCog }] : []),
    ...(hasPatrolReportsAccess(permissions) ? [{ key: 'reports' as const, label: 'Reports', icon: FileBarChart }] : []),
    ...(hasPatrolAdminAccess(permissions) ? [{ key: 'settings' as const, label: 'Settings', icon: Settings2 }] : []),
  ];
  const [searchParams] = useSearchParams();
  const tabFromUrl = searchParams.get('tab') as TabKey | null;
  const [activeTab, setActiveTab] = useState<TabKey>(tabFromUrl && tabs.some((t) => t.key === tabFromUrl) ? tabFromUrl : tabs[0]?.key || 'dashboard');

  if (!hasPatrolAccess(permissions)) {
    return <EmptyState icon={Footprints} title="Guard Patrolling access unavailable" description="Your current role does not have Guard Patrolling permissions." />;
  }

  if (isLoading) {
    return <div className="card p-8 text-center text-slate-400">Loading Guard Patrolling...</div>;
  }

  if (!isEnabled) {
    return (
      <EmptyState
        icon={Footprints}
        title="Module not enabled"
        description="Guard Patrolling is not enabled for this society yet."
        action={hasPatrolAdminAccess(permissions) ? <Link to="/modules" className="btn-primary">Open Module Registry</Link> : undefined}
      />
    );
  }

  const activeTabKey = tabs.some((t) => t.key === activeTab) ? activeTab : tabs[0]?.key;

  return (
    <div className="space-y-6">
      <PageHeader title="Guard Patrolling" subtitle={`${module?.name || 'Guard Patrolling'} — checkpoint rounds, GPS-verified scans, and Hit/Miss reporting`} />

      <div className="flex flex-wrap gap-2 border-b border-slate-100 pb-3">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium transition-colors ${activeTabKey === tab.key ? 'bg-primary-50 text-primary-700' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            <tab.icon className="w-4 h-4" /> {tab.label}
          </button>
        ))}
      </div>

      {activeTabKey === 'dashboard' && <PatrolDashboardTab />}
      {activeTabKey === 'checkpoints' && <PatrolCheckpointsTab />}
      {activeTabKey === 'routes' && <PatrolRoutesTab />}
      {activeTabKey === 'assignments' && <PatrolAssignmentsTab />}
      {activeTabKey === 'reports' && <PatrolReportsTab />}
      {activeTabKey === 'settings' && <PatrolSettingsTab />}
    </div>
  );
}
