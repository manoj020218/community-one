import { useQuery } from '@tanstack/react-query';
import { Bell, CreditCard, Car, Cat, User, UserCheck, MapPin } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api, extractData } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { hasPermission } from '../../utils/permissions';
import { hasMcrResidentAccess } from '../mcr/mcr.permissions';
import { useMcrModule } from '../mcr/useMcrModule';

export function ResidentDashboard() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { isEnabled: mcrEnabled } = useMcrModule();

  const { data: notifData } = useQuery({
    queryKey: ['notifications', 'count'],
    queryFn: () => extractData<{ count: number }>(api.get('/notifications/unread-count')),
  });

  const { data: myFlat } = useQuery({
    queryKey: ['flats-me'],
    queryFn: () => extractData<any>(api.get('/flats/me')),
    enabled: !!user?.flatId,
  });

  // Once MCR is enabled and this account has resident self-service access, send them to their
  // real dues/payment history there instead of the legacy society-wide Payments page — which,
  // for an admin-rank account viewing "My Home", would otherwise show the full admin payments
  // screen (they have PAYMENT_CREATE/PAYMENT_READ) instead of a resident-scoped view.
  const paymentsDestination = mcrEnabled && hasMcrResidentAccess(user?.permissions) ? '/mcr?tab=mine' : '/payments';

  const flatLabel = myFlat ? [myFlat.towerId?.name, myFlat.flatNo].filter(Boolean).join(' - ') : null;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Welcome */}
      <div className="bg-gradient-to-r from-teal-500 to-cyan-600 rounded-3xl p-6 text-white">
        <p className="text-teal-100 text-sm mb-1">Welcome back</p>
        <h1 className="text-2xl font-bold mb-1">{user?.name}</h1>
        <p className="text-teal-100 text-sm">{user?.societyName || 'Resident Portal'}</p>
        {flatLabel && (
          <p className="text-teal-100 text-sm flex items-center gap-1.5 mt-1"><MapPin className="w-3.5 h-3.5" /> {flatLabel}</p>
        )}
      </div>

      {/* Quick Access */}
      <div className="grid grid-cols-2 gap-4">
        {[
          { icon: Bell, label: 'Notifications', to: '/notifications', badge: notifData?.count, color: 'bg-purple-50 text-purple-600' },
          { icon: CreditCard, label: 'Payments', to: paymentsDestination, color: 'bg-blue-50 text-blue-600' },
          { icon: Car, label: 'My Vehicles', to: '/vehicles', color: 'bg-amber-50 text-amber-600' },
          { icon: Cat, label: 'My Pets', to: '/pets', color: 'bg-pink-50 text-pink-600' },
          { icon: User, label: 'My Profile', to: '/profile', color: 'bg-indigo-50 text-indigo-600' },
          ...(hasPermission(user, 'visitor.request.respond_own_flat') ? [{ icon: UserCheck, label: 'Visitor Requests', to: '/visitor', color: 'bg-emerald-50 text-emerald-600' }] : []),
        ].map((item) => (
          <button key={item.to} onClick={() => navigate(item.to)}
            className="card p-5 flex flex-col items-center gap-3 relative hover:shadow-card-hover transition-all">
            {item.badge && item.badge > 0 && (
              <span className="absolute top-3 right-3 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">{item.badge}</span>
            )}
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${item.color}`}>
              <item.icon className="w-6 h-6" />
            </div>
            <span className="text-sm font-medium text-slate-700">{item.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
