import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { X, Building2, User, LogOut, ChevronRight, ChevronDown, PowerOff } from 'lucide-react';
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
  const visitorModule = useSocietyModule('VISITOR');
  const mcrModule = useSocietyModule('MCR');
  const samaModule = useSamaModule();
  const leaseModule = useLeaseModule();
  const accessControlModule = useSocietyModule('ACCESS_CONTROL');
  const terms = useTerminology();
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  // Which toggleable Modules are currently on for this society — drives the grey/"Not
  // Activated" treatment below. A group with no moduleCode (Dashboard, Society Setup, ...)
  // is always considered enabled since it isn't a toggleable module at all.
  //
  // Roles like SECURITY_GUARD can see a module's nav item (via that item's own
  // permissions, e.g. visitor.request.create) without holding module.read, so their
  // module-status query never runs (isSuccess stays false). Treat "couldn't check" as
  // enabled rather than disabled — only a query that actually succeeded and confirmed
  // the module is off should trigger the grey/"Not Activated" state, so a role that can't
  // read module status isn't wrongly told an active module is off.
  const asEnabled = (q: { isEnabled: boolean; isSuccess: boolean }) => !q.isSuccess || q.isEnabled;
  const moduleEnabledMap: Record<string, boolean> = {
    VISITOR: asEnabled(visitorModule),
    MCR: asEnabled(mcrModule),
    SAMA: asEnabled(samaModule),
    LEASE: asEnabled(leaseModule),
    ACCESS_CONTROL: asEnabled(accessControlModule),
  };

  // Tier 1 vertical theming — same nav structure/routes for every org, only the
  // words change based on the org's vertical (Society/Tower/Flat vs Hostel/Block/Room).
  const navLabelOverrides: Record<string, string> = {
    '/towers': terms.buildingPlural,
    '/flats': terms.unitPlural,
    '/residents': terms.personPlural,
    '/parent-links': terms.parentLinkTitle,
  };
  const groupLabelOverrides: Record<string, string> = {
    society: terms.setupGroupLabel,
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
    toast.success('Logged out successfully');
  };

  // Whether the admin can even see this nav row — purely role/permission based. Module
  // on/off state is NOT part of visibility any more: a disabled module still shows (greyed,
  // with a "Not Activated" badge) so it's obvious the module exists but isn't turned on yet,
  // instead of silently vanishing from the menu.
  const itemVisible = (item: NavItem) => {
    if (item.permissions?.length && !hasAnyPermission(user, item.permissions)) return false;
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
          const singleItem = !showHeader ? group.items[0] : null;
          const moduleDisabled = !!group.moduleCode && !moduleEnabledMap[group.moduleCode];
          return (
            <div key={group.id}>
              {showHeader && (
                <button
                  type="button"
                  onClick={() => toggleGroup(group.id)}
                  className="w-full flex items-center gap-2 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-400 hover:text-slate-600"
                >
                  <span className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', group.color.dot)} />
                  <span className="flex-1 text-left">{group.letter}. {group.label}</span>
                  {isCollapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>
              )}
              {!isCollapsed && (
                <div className="space-y-0.5 mt-0.5">
                  {showHeader ? (
                    group.items.map((item) => (
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
                    ))
                  ) : singleItem && (
                    <NavLink
                      key={singleItem.to}
                      to={moduleDisabled ? '/modules' : singleItem.to}
                      onClick={mobile ? onClose : undefined}
                      title={moduleDisabled ? `${group.label} is not activated — go to Modules to turn it on` : undefined}
                      className={({ isActive }) => cn(
                        'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 group',
                        moduleDisabled ? 'text-slate-400 hover:bg-slate-50' : isActive ? group.color.activeBg : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900',
                        !moduleDisabled && isActive && group.color.activeText,
                      )}
                    >
                      {({ isActive }) => (
                        <>
                          <singleItem.icon className={cn('w-4 h-4 flex-shrink-0', moduleDisabled ? 'text-slate-300' : isActive ? group.color.text : 'text-slate-400 group-hover:text-slate-600')} />
                          <span className="flex-1 truncate">{group.letter}. {singleItem.label}</span>
                          {moduleDisabled ? (
                            <span className="flex items-center gap-1 text-[10px] font-semibold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-full flex-shrink-0">
                              <PowerOff className="w-2.5 h-2.5" /> Not Activated
                            </span>
                          ) : (
                            isActive && <span className={cn('w-1.5 h-1.5 rounded-full', group.color.activeDot)} />
                          )}
                        </>
                      )}
                    </NavLink>
                  )}
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
