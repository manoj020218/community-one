import { NavLink, useNavigate } from 'react-router-dom';
import { X, Home, Building2, Layers3, LayoutGrid, Users, Car, Cat, Shield, UserCog, Puzzle, Bell, ClipboardList, FolderOpen, CreditCard, Receipt, BarChart3, Cpu, Activity, User, Settings, LogOut, ChevronRight } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { cn } from '../../utils/cn';
import toast from 'react-hot-toast';

const navItems = [
  { to: '/dashboard', icon: Home, label: 'Dashboard', roles: [] },
  { to: '/societies', icon: Building2, label: 'Societies', roles: ['JENIX_SUPER_ADMIN', 'JENIX_SUPPORT'] },
  { to: '/towers', icon: Layers3, label: 'Towers & Blocks', roles: [] },
  { to: '/floors', icon: LayoutGrid, label: 'Floors', roles: [] },
  { to: '/flats', icon: LayoutGrid, label: 'Flats', roles: [] },
  { to: '/residents', icon: Users, label: 'Residents', roles: [] },
  { to: '/vehicles', icon: Car, label: 'Vehicles', roles: [] },
  { to: '/pets', icon: Cat, label: 'Pets', roles: [] },
  { to: '/roles', icon: Shield, label: 'Roles & Permissions', roles: ['JENIX_SUPER_ADMIN', 'SOCIETY_ADMIN'] },
  { to: '/users', icon: UserCog, label: 'Users', roles: ['JENIX_SUPER_ADMIN', 'JENIX_SUPPORT', 'SOCIETY_ADMIN', 'COMMITTEE_MEMBER', 'ACCOUNTANT', 'FACILITY_MANAGER'] },
  { to: '/modules', icon: Puzzle, label: 'Modules', roles: [] },
  { to: '/notifications', icon: Bell, label: 'Notifications', roles: [] },
  { to: '/audit', icon: ClipboardList, label: 'Audit Logs', roles: [] },
  { to: '/files', icon: FolderOpen, label: 'Files', roles: [] },
  { to: '/payments', icon: CreditCard, label: 'Payments', roles: [] },
  { to: '/receipts', icon: Receipt, label: 'Receipts', roles: [] },
  { to: '/reports', icon: BarChart3, label: 'Reports', roles: [] },
  { to: '/devices', icon: Cpu, label: 'Devices', roles: [] },
  { to: '/health', icon: Activity, label: 'System Health', roles: [] },
];

interface SidebarProps { mobile?: boolean; onClose?: () => void; }

export function Sidebar({ mobile, onClose }: SidebarProps) {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
    toast.success('Logged out successfully');
  };

  const visibleItems = navItems.filter((item) => {
    if (item.roles.length === 0) return true;
    return item.roles.includes(user?.roleCode || '');
  });

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
      <nav className="flex-1 overflow-y-auto py-4 px-3">
        <div className="space-y-0.5">
          {visibleItems.map((item) => (
            <NavLink key={item.to} to={item.to} onClick={mobile ? onClose : undefined}
              className={({ isActive }) => cn('flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 group', isActive ? 'bg-primary-50 text-primary-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900')}>
              {({ isActive }) => (
                <>
                  <item.icon className={cn('w-4 h-4 flex-shrink-0', isActive ? 'text-primary-600' : 'text-slate-400 group-hover:text-slate-600')} />
                  <span className="flex-1">{item.label}</span>
                  {isActive && <ChevronRight className="w-3 h-3 text-primary-400" />}
                </>
              )}
            </NavLink>
          ))}
        </div>
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
