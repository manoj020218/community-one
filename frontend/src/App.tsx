import { Routes, Route, Navigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { useAuthStore } from './store/authStore';
import { AppLayout } from './components/layout/AppLayout';
import { LoginPage } from './modules/auth/LoginPage';
import { SuperAdminDashboard } from './modules/dashboard/SuperAdminDashboard';
import { SocietyAdminDashboard } from './modules/dashboard/SocietyAdminDashboard';
import { ResidentDashboard } from './modules/dashboard/ResidentDashboard';
import { ParentDashboard } from './modules/dashboard/ParentDashboard';
import { ParentAccessLogPage } from './modules/parent/ParentAccessLogPage';
import { ParentLinksAdminPage } from './modules/parent/ParentLinksAdminPage';
import { BannerAdminPage } from './modules/banner/BannerAdminPage';
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
import { VisitorPage } from './modules/visitor/VisitorPage';
import { GuardKioskPage } from './modules/guardKiosk/GuardKioskPage';
import { McrPage } from './modules/mcr/McrPage';
import { SamaPage } from './modules/sama/SamaPage';
import { LeasePage } from './modules/lease/LeasePage';
import { AccessControlPage } from './modules/access-control/AccessControlPage';
import { RequireSociety } from './components/common/RequireSociety';
import { MarketingLayout } from './modules/marketing/MarketingLayout';
import { LandingPage } from './modules/marketing/LandingPage';
import { HostelLandingPage } from './modules/marketing/HostelLandingPage';
import { AboutPage } from './modules/marketing/AboutPage';
import { PrivacyPage } from './modules/marketing/PrivacyPage';
import { TermsPage } from './modules/marketing/TermsPage';
import { OnboardPage } from './modules/marketing/OnboardPage';
import { hasPermission } from './utils/permissions';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function DashboardRoute() {
  const { user } = useAuthStore();
  if (!user) return <Navigate to="/login" replace />;
  if (user.roleCode === 'SECURITY_GUARD') return <Navigate to="/guard-kiosk" replace />;
  if (hasPermission(user, 'visitor.request.create')) return <VisitorPage />;
  if (user.roleCode === 'JENIX_SUPER_ADMIN' || user.roleCode === 'JENIX_SUPPORT') return <SuperAdminDashboard />;
  if (user.roleCode === 'PARENT') return <ParentDashboard />;
  if (['OWNER', 'TENANT', 'FAMILY_MEMBER'].includes(user.roleCode)) return <ResidentDashboard />;
  return <SocietyAdminDashboard />;
}

// Root: show landing for web guests, redirect to dashboard for authenticated users.
// Inside the native app shell there's no one to market to — the user already installed
// it — so a logged-out guest goes straight to login instead of the marketing pitch.
function SmartHome() {
  const { isAuthenticated } = useAuthStore();
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;
  if (Capacitor.isNativePlatform()) return <Navigate to="/login" replace />;
  return <LandingPage />;
}

export default function App() {
  return (
    <Routes>
      {/* Auth */}
      <Route path="/login" element={<LoginPage />} />

      {/* Guard Kiosk — full-screen, no Sidebar/TopBar shell */}
      <Route path="/guard-kiosk" element={<ProtectedRoute><RequireSociety><GuardKioskPage /></RequireSociety></ProtectedRoute>} />

      {/* Public marketing routes — no auth required */}
      <Route element={<MarketingLayout />}>
        <Route path="/" element={<SmartHome />} />
        <Route path="/hostel" element={<HostelLandingPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/terms" element={<TermsPage />} />
        <Route path="/onboard" element={<OnboardPage />} />
      </Route>

      {/* Protected app routes — auth required, use AppLayout */}
      <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
        <Route path="/dashboard" element={<DashboardRoute />} />
        <Route path="/my-home" element={<RequireSociety><ResidentDashboard /></RequireSociety>} />
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
        <Route path="/mcr" element={<RequireSociety><McrPage /></RequireSociety>} />
        <Route path="/sama" element={<RequireSociety><SamaPage /></RequireSociety>} />
        <Route path="/lease" element={<RequireSociety><LeasePage /></RequireSociety>} />
        <Route path="/access" element={<RequireSociety><AccessControlPage /></RequireSociety>} />
        <Route path="/notifications" element={<NotificationPage />} />
        <Route path="/visitor" element={<RequireSociety><VisitorPage /></RequireSociety>} />
        <Route path="/audit" element={<RequireSociety><AuditPage /></RequireSociety>} />
        <Route path="/files" element={<RequireSociety><FilesPage /></RequireSociety>} />
        <Route path="/payments" element={<RequireSociety><PaymentPage /></RequireSociety>} />
        <Route path="/receipts" element={<RequireSociety><ReceiptPage /></RequireSociety>} />
        <Route path="/reports" element={<RequireSociety><ReportsPage /></RequireSociety>} />
        <Route path="/devices" element={<RequireSociety><DevicePage /></RequireSociety>} />
        <Route path="/health" element={<HealthPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/parent/access-logs" element={<ParentAccessLogPage />} />
        <Route path="/parent-links" element={<RequireSociety><ParentLinksAdminPage /></RequireSociety>} />
        <Route path="/banners" element={<BannerAdminPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
