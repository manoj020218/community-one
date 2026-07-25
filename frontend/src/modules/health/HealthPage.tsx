import { PageHeader } from '../../components/common/PageHeader';
import { HealthTab } from './HealthTab';

export function HealthPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="System Health" subtitle="Monitor platform and device status in real-time" />
      <HealthTab />
    </div>
  );
}
