import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { X, Building2, User, LogOut, ChevronRight, ChevronDown } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useSocietyModule } from '../../modules/moduleRegistry/useSocietyModules';
import { useSamaModule } from '../../modules/sama/useSamaModule';
import { useLeaseModule } from '../../modules/lease/useLeaseModule';
import { useTerminology } from '../../utils/terminology';
import { cn } from '../../utils/cn';
import { hasAnyPermission } from '../../utils/permissions';
import { navGroups, NavItem } from './sidebarNav';
import toast from 'react-hot-toast';

interface SidebarProps { mobile?: boolean; onClose?: () => void; }

export function Sidebar({ mobile, onClose }: SidebarProps) {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const { isEnabled: isMcrEnabled } = useSocietyModule('MCR');
  const { isEnabled: isSamaEnabled } = useSamaModule();
  const { isEnabled: isLeaseEnabled } = useLeaseModule();
  const terms = useTerminology();
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  // Tier 1 vertical theming — same nav structure/routes for every org, only the
  // words change based on the org's vertical (Society/Tower/Flat vs Hostel/Block/Room).
  const navLabelOverrides: Record<string, string> = {
    '/towers': terms.buildingPlural,
    '/flats': terms.unitPlural,
    '/residents': terms.personPlural,
  };
  const groupLabelOverrides: Record<string, string> = {
    society: terms.setupGroupLabel,
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
    toast.success('Logged out successfully');
  };

  const itemVisible = (item: NavItem) => {
    if (item.permissions?.length && !hasAnyPermission(user, item.permissions)) return false;
    if (item.moduleCode === 'MCR' && !isMcrEnabled) return false;
    if (item.moduleCode === 'SAMA' && !isSamaEnabled) return false;
    if (item.moduleCode === 'LEASE' && !isLeaseEnabled) return false;
    if (item.roles.length === 0) return true;
    return item.roles.includes(user?.roleCode || '');
  };

  const visibleGroups = navGroups
    .map((group) => ({
      ...group,
      label: groupLabelOverrides[group.id] || group.label,
      items: group.items.filter(itemVisible).map((item) => ({ ...item, label: navLabelOverrides[item.to] || item.label })),
    }))
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
            <p className="text-xs text-slate-500">{terms.brandSubtitle}</p>
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
