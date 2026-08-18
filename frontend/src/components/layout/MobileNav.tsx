import { NavLink } from 'react-router-dom';
import { Home, Building2, Users, Bell, MoreHorizontal, CreditCard, UserCheck, User, ShieldCheck } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { hasPermission } from '../../utils/permissions';
import { cn } from '../../utils/cn';

const RESIDENT_ROLES = ['OWNER', 'TENANT', 'FAMILY_MEMBER'];

const parentNavItems = [
  { to: '/dashboard', icon: Home, label: 'Home' },
  { to: '/parent/access-logs', icon: ShieldCheck, label: 'Access' },
  { to: '/notifications', icon: Bell, label: 'Alerts' },
  { to: '/profile', icon: User, label: 'Profile' },
];

const adminNavItems = [
  { to: '/dashboard', icon: Home, label: 'Home' },
  { to: '/societies', icon: Building2, label: 'Societies' },
  { to: '/residents', icon: Users, label: 'Residents' },
  { to: '/notifications', icon: Bell, label: 'Alerts' },
  { to: '/settings', icon: MoreHorizontal, label: 'More' },
];

export function MobileNav() {
  const { user } = useAuthStore();
  const isResident = !!user && RESIDENT_ROLES.includes(user.roleCode);
  const isParent = user?.roleCode === 'PARENT';
  const canRespondVisitors = hasPermission(user, 'visitor.request.respond_own_flat');

  const items = isParent
    ? parentNavItems
    : isResident
    ? [
        { to: '/dashboard', icon: Home, label: 'Home' },
        { to: '/payments', icon: CreditCard, label: 'Payments' },
        ...(canRespondVisitors ? [{ to: '/visitor', icon: UserCheck, label: 'Visitors' }] : []),
        { to: '/notifications', icon: Bell, label: 'Alerts' },
        { to: '/profile', icon: User, label: 'Profile' },
      ]
    : adminNavItems;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-slate-100 safe-area-bottom">
      <div className="flex items-center justify-around h-16 px-2">
        {items.map((item) => (
          <NavLink key={item.to} to={item.to}
            className={({ isActive }) => cn(
              'flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all min-w-[52px]',
              isActive ? 'text-primary-600' : 'text-slate-400'
            )}>
            {({ isActive }) => (
              <>
                <item.icon className={cn('w-5 h-5', isActive && 'text-primary-600')} />
                <span className="text-[10px] font-medium">{item.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
