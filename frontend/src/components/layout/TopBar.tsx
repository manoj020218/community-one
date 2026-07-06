import { Menu, Bell, ChevronDown, Building2 } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useSocietyStore } from '../../store/societyStore';
import { getInitials } from '../../utils/cn';
import { useNavigate } from 'react-router-dom';

interface TopBarProps { onMenuClick: () => void; }

export function TopBar({ onMenuClick }: TopBarProps) {
  const { user } = useAuthStore();
  const { currentSociety } = useSocietyStore();
  const navigate = useNavigate();

  return (
    <header className="h-16 bg-white border-b border-slate-100 flex items-center justify-between px-4 lg:px-8 flex-shrink-0">
      {/* Left: Menu + Society Switcher */}
      <div className="flex items-center gap-4">
        <button onClick={onMenuClick} className="lg:hidden p-2 rounded-lg hover:bg-slate-100 text-slate-500">
          <Menu className="w-5 h-5" />
        </button>

        {currentSociety && (
          <button
            onClick={() => navigate('/societies')}
            className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary-50 border border-primary-100 text-primary-700 text-sm font-medium hover:bg-primary-100 transition-colors"
          >
            <Building2 className="w-4 h-4" />
            <span className="max-w-[180px] truncate">{currentSociety.name}</span>
            <ChevronDown className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Right: Notifications + Profile */}
      <div className="flex items-center gap-2">
        <button onClick={() => navigate('/notifications')} className="relative p-2 rounded-xl hover:bg-slate-100 text-slate-500 transition-colors">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
        </button>

        <button onClick={() => navigate('/profile')} className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl hover:bg-slate-100 transition-colors">
          <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-purple-500 rounded-full flex items-center justify-center">
            {user?.photoUrl ? (
              <img src={user.photoUrl} alt={user.name} className="w-8 h-8 rounded-full object-cover" />
            ) : (
              <span className="text-white text-xs font-bold">{getInitials(user?.name || 'U')}</span>
            )}
          </div>
          <div className="hidden sm:block text-left">
            <p className="text-sm font-semibold text-slate-800 leading-tight">{user?.name?.split(' ')[0]}</p>
            <p className="text-xs text-slate-500 leading-tight">{user?.roleCode?.replace(/_/g, ' ')}</p>
          </div>
        </button>
      </div>
    </header>
  );
}
