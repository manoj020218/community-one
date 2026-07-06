import { NavLink } from 'react-router-dom';
import { Home, Building2, Users, Bell, MoreHorizontal } from 'lucide-react';
import { cn } from '../../utils/cn';

const mobileNavItems = [
  { to: '/dashboard', icon: Home, label: 'Home' },
  { to: '/societies', icon: Building2, label: 'Societies' },
  { to: '/residents', icon: Users, label: 'Residents' },
  { to: '/notifications', icon: Bell, label: 'Alerts' },
  { to: '/settings', icon: MoreHorizontal, label: 'More' },
];

export function MobileNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-slate-100 safe-area-bottom">
      <div className="flex items-center justify-around h-16 px-2">
        {mobileNavItems.map((item) => (
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
