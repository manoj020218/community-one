import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Users, LayoutDashboard, Home, Tag, Briefcase, ClipboardList, ShieldCheck, Cable, FileBarChart,
} from 'lucide-react';
import { EmptyState } from '../../components/common/EmptyState';
import { PageHeader } from '../../components/common/PageHeader';
import { useAuthStore } from '../../store/authStore';
import { useSamaModule } from './useSamaModule';
import {
  hasSamaAccess, hasSamaAccessControlAccess, hasSamaAdminAccess, hasSamaBridgeAccess, hasSamaCategoryAccess,
  hasSamaHouseholdAdminAccess, hasSamaProviderAccess, hasSamaReportsAccess, hasSamaResidentAccess, hasSamaStaffAccess,
  hasSamaWorkOrderAccess,
} from './sama.permissions';
import { SamaDashboardTab } from './SamaDashboardTab';
import { SamaMyHouseholdTab } from './SamaMyHouseholdTab';
import { SamaStaffTab } from './SamaStaffTab';
import { SamaCategoriesTab } from './SamaCategoriesTab';
import { SamaHouseholdTab } from './SamaHouseholdTab';
import { SamaProvidersTab } from './SamaProvidersTab';
import { SamaWorkOrdersTab } from './SamaWorkOrdersTab';
import { SamaAccessTab } from './SamaAccessTab';
import { SamaBridgeTab } from './SamaBridgeTab';
import { SamaReportsTab } from './SamaReportsTab';

type TabKey = 'dashboard' | 'myHousehold' | 'staff' | 'categories' | 'household' | 'providers' | 'workOrders' | 'access' | 'bridge' | 'reports';

export function SamaPage() {
  const { user } = useAuthStore();
  const permissions = user?.permissions || [];
  const { module, isEnabled, isLoading } = useSamaModule();

  const tabs: Array<{ key: TabKey; label: string; icon: typeof Users }> = [
    { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    ...(hasSamaResidentAccess(permissions) ? [{ key: 'myHousehold' as const, label: 'My Household', icon: Home }] : []),
    ...(hasSamaStaffAccess(permissions) ? [{ key: 'staff' as const, label: 'Staff', icon: Users }] : []),
    ...(hasSamaCategoryAccess(permissions) ? [{ key: 'categories' as const, label: 'Categories', icon: Tag }] : []),
    ...(hasSamaHouseholdAdminAccess(permissions) ? [{ key: 'household' as const, label: 'Household', icon: Home }] : []),
    ...(hasSamaProviderAccess(permissions) ? [{ key: 'providers' as const, label: 'Providers', icon: Briefcase }] : []),
    ...(hasSamaWorkOrderAccess(permissions) ? [{ key: 'workOrders' as const, label: 'Work Orders', icon: ClipboardList }] : []),
    ...(hasSamaAccessControlAccess(permissions) ? [{ key: 'access' as const, label: 'Access', icon: ShieldCheck }] : []),
    ...(hasSamaBridgeAccess(permissions) ? [{ key: 'bridge' as const, label: 'Bridge & Sync', icon: Cable }] : []),
    ...(hasSamaReportsAccess(permissions) ? [{ key: 'reports' as const, label: 'Reports', icon: FileBarChart }] : []),
  ];
  const [activeTab, setActiveTab] = useState<TabKey>(tabs[0]?.key || 'dashboard');

  if (!hasSamaAccess(permissions)) {
    return <EmptyState icon={Users} title="SAMA access unavailable" description="Your current role does not have Staff, Attendance & Access permissions." />;
  }

  if (isLoading) {
    return <div className="card p-8 text-center text-slate-400">Loading Staff, Attendance & Access...</div>;
  }

  if (!isEnabled) {
    return (
      <EmptyState
        icon={Users}
        title="Module not enabled"
        description="Staff, Attendance & Access is not enabled for this society yet."
        action={hasSamaAdminAccess(permissions) ? <Link to="/modules" className="btn-primary">Open Module Registry</Link> : undefined}
      />
    );
  }

  const activeTabKey = tabs.some((t) => t.key === activeTab) ? activeTab : tabs[0]?.key;

  return (
    <div className="space-y-6">
      <PageHeader title="Staff, Attendance & Access" subtitle={`${module?.name || 'Staff, Attendance & Access'} — staff master, household approvals, service pool, and access control`} />

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

      {activeTabKey === 'dashboard' && <SamaDashboardTab />}
      {activeTabKey === 'myHousehold' && <SamaMyHouseholdTab />}
      {activeTabKey === 'staff' && <SamaStaffTab />}
      {activeTabKey === 'categories' && <SamaCategoriesTab />}
      {activeTabKey === 'household' && <SamaHouseholdTab />}
      {activeTabKey === 'providers' && <SamaProvidersTab />}
      {activeTabKey === 'workOrders' && <SamaWorkOrdersTab />}
      {activeTabKey === 'access' && <SamaAccessTab />}
      {activeTabKey === 'bridge' && <SamaBridgeTab />}
      {activeTabKey === 'reports' && <SamaReportsTab />}
    </div>
  );
}
