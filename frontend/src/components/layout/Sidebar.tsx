import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { X, Home, Building2, Layers3, LayoutGrid, Users, Car, Cat, Shield, UserCog, Puzzle, Bell, ClipboardList, FolderOpen, BarChart3, Cpu, User, LogOut, ChevronRight, ChevronDown, UserCheck, Banknote, Settings } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useSocietyModule } from '../../modules/moduleRegistry/useSocietyModules';
import { MCR_ROUTE_PERMISSIONS } from '../../modules/mcr/mcr.permissions';
import { useSamaModule } from '../../modules/sama/useSamaModule';
import { SAMA_ROUTE_PERMISSIONS } from '../../modules/sama/sama.permissions';
import { cn } from '../../utils/cn';
import { hasAnyPermission } from '../../utils/permissions';
import toast from 'react-hot-toast';

type NavItem = {
  to: string;
  icon: any;
  label: string;
  roles: string[];
  permissions?: string[];
  moduleCode?: string;
};

type GroupColor = {
  text: string;
  dot: string;
  activeBg: string;
  activeText: string;
  activeDot: string;
};

type NavGroup = {
  id: string;
  label: string;
  color: GroupColor;
  items: NavItem[];
};

// Payments/Receipts (legacy) are intentionally omitted from navigation — MCR is the
// current source of truth for maintenance billing. Their routes/backend stay live
// since report.service.ts still reads from them.
const navGroups: NavGroup[] = [
  {
    id: 'overview',
    label: 'Overview',
    color: { text: 'text-primary-600', dot: 'bg-primary-500', activeBg: 'bg-primary-50', activeText: 'text-primary-700', activeDot: 'bg-primary-500' },
    items: [
      { to: '/dashboard', icon: Home, label: 'Dashboard', roles: [] },
    ],
  },
  {
    id: 'society',
    label: 'Society Setup',
    color: { text: 'text-sky-600', dot: 'bg-sky-500', activeBg: 'bg-sky-50', activeText: 'text-sky-700', activeDot: 'bg-sky-500' },
    items: [
      { to: '/societies', icon: Building2, label: 'Societies', roles: ['JENIX_SUPER_ADMIN', 'JENIX_SUPPORT'] },
      { to: '/towers', icon: Layers3, label: 'Towers & Blocks', roles: [] },
      { to: '/floors', icon: LayoutGrid, label: 'Floors', roles: [] },
      { to: '/flats', icon: LayoutGrid, label: 'Flats', roles: [] },
      { to: '/residents', icon: Users, label: 'Residents', roles: [] },
      { to: '/vehicles', icon: Car, label: 'Vehicles', roles: [] },
      { to: '/pets', icon: Cat, label: 'Pets', roles: [] },
    ],
  },
  {
    id: 'access',
    label: 'Access & Security',
    color: { text: 'text-amber-600', dot: 'bg-amber-500', activeBg: 'bg-amber-50', activeText: 'text-amber-700', activeDot: 'bg-amber-500' },
    items: [
      { to: '/visitor', icon: UserCheck, label: 'Visitor Desk', roles: [], permissions: ['visitor.request.create', 'visitor.request.respond_own_flat', 'visitor.report.view', 'visitor.request.view_society'] },
    ],
  },
  {
    id: 'mcr',
    label: 'Maintenance & Receipts',
    color: { text: 'text-emerald-600', dot: 'bg-emerald-500', activeBg: 'bg-emerald-50', activeText: 'text-emerald-700', activeDot: 'bg-emerald-500' },
    items: [
      { to: '/mcr', icon: Banknote, label: 'Maintenance & Receipts', roles: [], permissions: [...MCR_ROUTE_PERMISSIONS], moduleCode: 'MCR' },
    ],
  },
  {
    id: 'sama',
    label: 'Staff, Attendance & Access',
    color: { text: 'text-violet-600', dot: 'bg-violet-500', activeBg: 'bg-violet-50', activeText: 'text-violet-700', activeDot: 'bg-violet-500' },
    items: [
      { to: '/sama', icon: UserCog, label: 'Staff, Attendance & Access', roles: [], permissions: [...SAMA_ROUTE_PERMISSIONS], moduleCode: 'SAMA' },
    ],
  },
  {
    id: 'people',
    label: 'People & Roles',
    color: { text: 'text-fuchsia-600', dot: 'bg-fuchsia-500', activeBg: 'bg-fuchsia-50', activeText: 'text-fuchsia-700', activeDot: 'bg-fuchsia-500' },
    items: [
      { to: '/roles', icon: Shield, label: 'Roles & Permissions', roles: ['JENIX_SUPER_ADMIN', 'SOCIETY_ADMIN'] },
      { to: '/users', icon: UserCog, label: 'Users', roles: ['JENIX_SUPER_ADMIN', 'JENIX_SUPPORT', 'SOCIETY_ADMIN', 'COMMITTEE_MEMBER', 'ACCOUNTANT', 'FACILITY_MANAGER'] },
    ],
  },
  {
    id: 'platform',
    label: 'Platform',
    color: { text: 'text-slate-500', dot: 'bg-slate-400', activeBg: 'bg-slate-100', activeText: 'text-slate-800', activeDot: 'bg-slate-500' },
    items: [
      { to: '/settings', icon: Settings, label: 'Settings', roles: [] },
      { to: '/modules', icon: Puzzle, label: 'Modules', roles: [] },
      { to: '/notifications', icon: Bell, label: 'Notifications', roles: [] },
      { to: '/audit', icon: ClipboardList, label: 'Audit Logs', roles: [] },
      { to: '/files', icon: FolderOpen, label: 'Files', roles: [] },
      { to: '/reports', icon: BarChart3, label: 'Reports', roles: [] },
      { to: '/devices', icon: Cpu, label: 'Devices', roles: [] },
    ],
  },
];

interface SidebarProps { mobile?: boolean; onClose?: () => void; }

export function Sidebar({ mobile, onClose }: SidebarProps) {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const { isEnabled: isMcrEnabled } = useSocietyModule('MCR');
  const { isEnabled: isSamaEnabled } = useSamaModule();
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const handleLogout = () => {
    logout();
    navigate('/login');
    toast.success('Logged out successfully');
  };

  const itemVisible = (item: NavItem) => {
    if (item.permissions?.length && !hasAnyPermission(user, item.permissions)) return false;
    if (item.moduleCode === 'MCR' && !isMcrEnabled) return false;
    if (item.moduleCode === 'SAMA' && !isSamaEnabled) return false;
    if (item.roles.length === 0) return true;
    return item.roles.includes(user?.roleCode || '');
  };

  const visibleGroups = navGroups
    .map((group) => ({ ...group, items: group.items.filter(itemVisible) }))
    .filter((group) => group.items.length > 0);

  const toggleGroup = (id: string) => setCollapsed((prev) => ({ ...prev, [id]: !prev[id] }));

  return (
    <div className={cn('flex flex-col h-full bg-white border-r border-slate-100', mobile ? 'w-72 relative z-50' : 'w-64')}>
      {/* Logo */}
      <div className="flex items-center justify-between px-6 h-16 border-b border-slate-100 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-primary-600 to-purple-600 rounded-lg flex items-center justify-center">
            <Building2 className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-900">Jenix</p>
            <p className="text-xs text-slate-500">Society One</p>
          </div>
        </div>
        {mobile && <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100"><X className="w-5 h-5 text-slate-500" /></button>}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-4">
        {visibleGroups.map((group) => {
          const isCollapsed = !!collapsed[group.id];
          const showHeader = group.items.length > 1;
          return (
            <div key={group.id}>
              {showHeader && (
                <button
                  type="button"
                  onClick={() => toggleGroup(group.id)}
                  className="w-full flex items-center gap-2 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-400 hover:text-slate-600"
                >
                  <span className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', group.color.dot)} />
                  <span className="flex-1 text-left">{group.label}</span>
                  {isCollapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>
              )}
              {!isCollapsed && (
                <div className="space-y-0.5 mt-0.5">
                  {group.items.map((item) => (
                    <NavLink key={item.to} to={item.to} onClick={mobile ? onClose : undefined}
                      className={({ isActive }) => cn(
                        'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 group',
                        isActive ? group.color.activeBg : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900',
                        isActive && group.color.activeText,
                      )}
                    >
                      {({ isActive }) => (
                        <>
                          <item.icon className={cn('w-4 h-4 flex-shrink-0', isActive ? group.color.text : 'text-slate-400 group-hover:text-slate-600')} />
                          <span className="flex-1">{item.label}</span>
                          {isActive && <span className={cn('w-1.5 h-1.5 rounded-full', group.color.activeDot)} />}
                        </>
                      )}
                    </NavLink>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* User */}
      <div className="border-t border-slate-100 p-3 space-y-0.5">
        <NavLink to="/profile" className={({ isActive }) => cn('flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all', isActive ? 'bg-primary-50 text-primary-700' : 'text-slate-600 hover:bg-slate-50')}>
          <User className="w-4 h-4 text-slate-400" />
          <div className="flex-1 min-w-0">
            <p className="font-medium text-slate-800 truncate">{user?.name}</p>
            <p className="text-xs text-slate-500 truncate">{user?.roleCode?.replace(/_/g, ' ')}</p>
          </div>
        </NavLink>
        <button onClick={handleLogout} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 transition-all">
          <LogOut className="w-4 h-4" /><span>Sign Out</span>
        </button>
      </div>
    </div>
  );
}
