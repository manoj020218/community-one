import { PageHeader } from '../../components/common/PageHeader';
import { MembersManagementPanel } from './MembersManagementPanel';

export function UsersPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Users" subtitle="Manage system users · create and view accounts by role" />
      <MembersManagementPanel />
    </div>
  );
}
