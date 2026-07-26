import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Banknote, LayoutDashboard, Wallet, ListTree, CalendarClock,
  FileText, CreditCard, Receipt, FileBarChart, ShieldCheck, Settings2,
} from 'lucide-react';
import { EmptyState } from '../../components/common/EmptyState';
import { PageHeader } from '../../components/common/PageHeader';
import { useAuthStore } from '../../store/authStore';
import { useMcrModule } from './useMcrModule';
import {
  hasMcrAccess, hasMcrAdminAccess, hasMcrConfigureAccess, hasMcrDemandAccess,
  hasMcrGatewayAccess, hasMcrPaymentAccess, hasMcrReceiptAccess, hasMcrReportsAccess, hasMcrResidentAccess,
} from './mcr.permissions';
import { McrDashboardTab } from './McrDashboardTab';
import { McrMyMaintenanceTab } from './McrMyMaintenanceTab';
import { McrChargeHeadsTab } from './McrChargeHeadsTab';
import { McrBillingPlansTab } from './McrBillingPlansTab';
import { McrDemandsTab } from './McrDemandsTab';
import { McrPaymentsTab } from './McrPaymentsTab';
import { McrReceiptsTab } from './McrReceiptsTab';
import { McrReportsTab } from './McrReportsTab';
import { McrGatewayTab } from './McrGatewayTab';
import { McrSettingsTab } from './McrSettingsTab';

type TabKey = 'dashboard' | 'mine' | 'chargeHeads' | 'billingPlans' | 'demands' | 'payments' | 'receipts' | 'reports' | 'gateway' | 'settings';

export function McrPage() {
  const { user } = useAuthStore();
  const permissions = user?.permissions || [];
  const { module, isEnabled, isLoading } = useMcrModule();

  const tabs: Array<{ key: TabKey; label: string; icon: typeof Banknote }> = [
    { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    ...(hasMcrResidentAccess(permissions) ? [{ key: 'mine' as const, label: 'My Maintenance', icon: Wallet }] : []),
    ...(hasMcrConfigureAccess(permissions) ? [{ key: 'chargeHeads' as const, label: 'Charge Heads', icon: ListTree }] : []),
    ...(hasMcrConfigureAccess(permissions) ? [{ key: 'billingPlans' as const, label: 'Billing Plans', icon: CalendarClock }] : []),
    ...(hasMcrDemandAccess(permissions) ? [{ key: 'demands' as const, label: 'Demands', icon: FileText }] : []),
    ...(hasMcrPaymentAccess(permissions) ? [{ key: 'payments' as const, label: 'Payments', icon: CreditCard }] : []),
    ...(hasMcrReceiptAccess(permissions) ? [{ key: 'receipts' as const, label: 'Receipts', icon: Receipt }] : []),
    ...(hasMcrReportsAccess(permissions) ? [{ key: 'reports' as const, label: 'Reports', icon: FileBarChart }] : []),
    ...(hasMcrGatewayAccess(permissions) ? [{ key: 'gateway' as const, label: 'Gateway', icon: ShieldCheck }] : []),
    ...(hasMcrConfigureAccess(permissions) ? [{ key: 'settings' as const, label: 'Settings', icon: Settings2 }] : []),
  ];
  const [activeTab, setActiveTab] = useState<TabKey>(tabs[0]?.key || 'dashboard');

  if (!hasMcrAccess(permissions)) {
    return <EmptyState icon={Banknote} title="MCR access unavailable" description="Your current role does not have Maintenance & Receipts permissions." />;
  }

  if (isLoading) {
    return <div className="card p-8 text-center text-slate-400">Loading Maintenance & Receipts...</div>;
  }

  if (!isEnabled) {
    return (
      <EmptyState
        icon={Banknote}
        title="Module not enabled"
        description="Maintenance & Receipts is not enabled for this society yet."
        action={hasMcrAdminAccess(permissions) ? <Link to="/modules" className="btn-primary">Open Module Registry</Link> : undefined}
      />
    );
  }

  const activeTabKey = tabs.some((t) => t.key === activeTab) ? activeTab : tabs[0]?.key;

  return (
    <div className="space-y-6">
      <PageHeader title="Maintenance & Receipts" subtitle={`${module?.name || 'Maintenance & Receipts'} — demands, collections, and receipts for this society`} />

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

      {activeTabKey === 'dashboard' && <McrDashboardTab />}
      {activeTabKey === 'mine' && <McrMyMaintenanceTab />}
      {activeTabKey === 'chargeHeads' && <McrChargeHeadsTab />}
      {activeTabKey === 'billingPlans' && <McrBillingPlansTab />}
      {activeTabKey === 'demands' && <McrDemandsTab />}
      {activeTabKey === 'payments' && <McrPaymentsTab />}
      {activeTabKey === 'receipts' && <McrReceiptsTab />}
      {activeTabKey === 'reports' && <McrReportsTab />}
      {activeTabKey === 'gateway' && <McrGatewayTab />}
      {activeTabKey === 'settings' && <McrSettingsTab />}
    </div>
  );
}
