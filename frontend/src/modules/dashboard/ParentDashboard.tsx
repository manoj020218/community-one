import { useQuery } from '@tanstack/react-query';
import { Bell, ShieldCheck, User, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api, extractData } from '../../services/api';
import { useAuthStore } from '../../store/authStore';

interface Ward {
  _id: string;
  name: string;
  photoUrl?: string;
}

export function ParentDashboard() {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const { data: notifData } = useQuery({
    queryKey: ['notifications', 'count'],
    queryFn: () => extractData<{ count: number }>(api.get('/notifications/unread-count')),
  });

  const { data: wards = [] } = useQuery({
    queryKey: ['parent-ward-links', 'my-wards'],
    queryFn: () => extractData<Ward[]>(api.get('/parent-ward-links/me/wards')),
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-3xl p-6 text-white">
        <p className="text-indigo-100 text-sm mb-1">Welcome back</p>
        <h1 className="text-2xl font-bold mb-1">{user?.name}</h1>
        <p className="text-indigo-100 text-sm">Parent Portal</p>
      </div>

      {wards.length > 0 && (
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-3 text-slate-500 text-xs font-semibold uppercase tracking-wide">
            <Users className="w-4 h-4" /> Your Ward{wards.length > 1 ? 's' : ''}
          </div>
          <div className="flex flex-wrap gap-3">
            {wards.map((ward) => (
              <div key={ward._id} className="flex items-center gap-2 bg-slate-50 rounded-xl px-3 py-2">
                <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-bold">
                  {ward.name.slice(0, 1).toUpperCase()}
                </div>
                <span className="text-sm font-medium text-slate-700">{ward.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        {[
          { icon: Bell, label: 'Notifications', to: '/notifications', badge: notifData?.count, color: 'bg-purple-50 text-purple-600' },
          { icon: ShieldCheck, label: 'Access Logs', to: '/parent/access-logs', color: 'bg-emerald-50 text-emerald-600' },
          { icon: User, label: 'My Profile', to: '/profile', color: 'bg-indigo-50 text-indigo-600' },
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

      {wards.length === 0 && (
        <div className="card p-6 text-center text-slate-500 text-sm">
          No ward linked to your account yet. Ask your society/hostel admin to link you to your child's resident profile.
        </div>
      )}
    </div>
  );
}
