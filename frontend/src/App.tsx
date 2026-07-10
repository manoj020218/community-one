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
import { UsersPage } from './modules/users/UsersPage';
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
import { RequireSociety } from './components/common/RequireSociety';
import { MarketingLayout } from './modules/marketing/MarketingLayout';
import { LandingPage } from './modules/marketing/LandingPage';
import { AboutPage } from './modules/marketing/AboutPage';
import { PrivacyPage } from './modules/marketing/PrivacyPage';
import { TermsPage } from './modules/marketing/TermsPage';

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

// Root: show landing for guests, redirect to dashboard for authenticated users
function SmartHome() {
  const { isAuthenticated } = useAuthStore();
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;
  return <LandingPage />;
}

export default function App() {
  return (
    <Routes>
      {/* Auth */}
      <Route path="/login" element={<LoginPage />} />

      {/* Public marketing routes — no auth required */}
      <Route element={<MarketingLayout />}>
        <Route path="/" element={<SmartHome />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/terms" element={<TermsPage />} />
      </Route>

      {/* Protected app routes — auth required, use AppLayout */}
      <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
        <Route path="/dashboard" element={<DashboardRoute />} />
        <Route path="/societies" element={<SocietyListPage />} />
        <Route path="/societies/new" element={<SocietyFormPage />} />
        <Route path="/societies/:id/edit" element={<SocietyFormPage />} />
        <Route path="/societies/:id/onboarding" element={<OnboardingWizard />} />
        <Route path="/towers" element={<RequireSociety><TowerPage /></RequireSociety>} />
        <Route path="/floors" element={<RequireSociety><FloorPage /></RequireSociety>} />
        <Route path="/flats" element={<RequireSociety><FlatPage /></RequireSociety>} />
        <Route path="/residents" element={<RequireSociety><ResidentPage /></RequireSociety>} />
        <Route path="/vehicles" element={<RequireSociety><VehiclePage /></RequireSociety>} />
        <Route path="/pets" element={<RequireSociety><PetPage /></RequireSociety>} />
        <Route path="/roles" element={<RolesPage />} />
        <Route path="/users" element={<RequireSociety><UsersPage /></RequireSociety>} />
        <Route path="/modules" element={<RequireSociety><ModuleRegistryPage /></RequireSociety>} />
        <Route path="/notifications" element={<NotificationPage />} />
        <Route path="/audit" element={<RequireSociety><AuditPage /></RequireSociety>} />
        <Route path="/files" element={<RequireSociety><FilesPage /></RequireSociety>} />
        <Route path="/payments" element={<RequireSociety><PaymentPage /></RequireSociety>} />
        <Route path="/receipts" element={<RequireSociety><ReceiptPage /></RequireSociety>} />
        <Route path="/reports" element={<RequireSociety><ReportsPage /></RequireSociety>} />
        <Route path="/devices" element={<RequireSociety><DevicePage /></RequireSociety>} />
        <Route path="/health" element={<HealthPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
