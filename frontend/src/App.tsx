import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import { AppLayout } from './components/layout/AppLayout';
import { LoginPage } from './modules/auth/LoginPage';
import { SuperAdminDashboard } from './modules/dashboard/SuperAdminDashboard';
import { SocietyAdminDashboard } from './modules/dashboard/SocietyAdminDashboard';
import { ResidentDashboard } from './modules/dashboard/ResidentDashboard';
import { SocietyListPage } from './modules/society/SocietyListPage';
import { SocietyFormPage } from './modules/society/SocietyFormPage';
import { OnboardingWizard } from './modules/onboarding/OnboardingWizard';
import { TowerPage } from './modules/tower/TowerPage';
import { FloorPage } from './modules/floor/FloorPage';
import { FlatPage } from './modules/flat/FlatPage';
import { ResidentPage } from './modules/resident/ResidentPage';
import { VehiclePage } from './modules/vehicle/VehiclePage';
import { PetPage } from './modules/pet/PetPage';
import { RolesPage } from './modules/roles/RolesPage';
import { ModuleRegistryPage } from './modules/moduleRegistry/ModuleRegistryPage';
import { NotificationPage } from './modules/notification/NotificationPage';
import { AuditPage } from './modules/audit/AuditPage';
import { FilesPage } from './modules/files/FilesPage';
import { PaymentPage } from './modules/payment/PaymentPage';
import { ReceiptPage } from './modules/receipt/ReceiptPage';
import { ReportsPage } from './modules/reports/ReportsPage';
import { DevicePage } from './modules/device/DevicePage';
import { HealthPage } from './modules/health/HealthPage';
import { ProfilePage } from './modules/profile/ProfilePage';
import { SettingsPage } from './modules/settings/SettingsPage';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function DashboardRoute() {
  const { user } = useAuthStore();
  if (!user) return <Navigate to="/login" replace />;
  if (user.roleCode === 'JENIX_SUPER_ADMIN' || user.roleCode === 'JENIX_SUPPORT') return <SuperAdminDashboard />;
  if (['OWNER', 'TENANT', 'FAMILY_MEMBER'].includes(user.roleCode)) return <ResidentDashboard />;
  return <SocietyAdminDashboard />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
        <Route index element={<DashboardRoute />} />
        <Route path="dashboard" element={<DashboardRoute />} />
        <Route path="societies" element={<SocietyListPage />} />
        <Route path="societies/new" element={<SocietyFormPage />} />
        <Route path="societies/:id/edit" element={<SocietyFormPage />} />
        <Route path="societies/:id/onboarding" element={<OnboardingWizard />} />
        <Route path="towers" element={<TowerPage />} />
        <Route path="floors" element={<FloorPage />} />
        <Route path="flats" element={<FlatPage />} />
        <Route path="residents" element={<ResidentPage />} />
        <Route path="vehicles" element={<VehiclePage />} />
        <Route path="pets" element={<PetPage />} />
        <Route path="roles" element={<RolesPage />} />
        <Route path="modules" element={<ModuleRegistryPage />} />
        <Route path="notifications" element={<NotificationPage />} />
        <Route path="audit" element={<AuditPage />} />
        <Route path="files" element={<FilesPage />} />
        <Route path="payments" element={<PaymentPage />} />
        <Route path="receipts" element={<ReceiptPage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="devices" element={<DevicePage />} />
        <Route path="health" element={<HealthPage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
