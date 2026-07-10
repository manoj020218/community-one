import { useNavigate } from 'react-router-dom';
import { Building2 } from 'lucide-react';
import { useSocietyStore } from '../../store/societyStore';
import { useAuthStore } from '../../store/authStore';

export function RequireSociety({ children }: { children: React.ReactNode }) {
  const { currentSociety } = useSocietyStore();
  const { user } = useAuthStore();
  const navigate = useNavigate();

  // Society admins always have user.societyId; super admins need to select one
  const hasSociety = !!currentSociety || !!user?.societyId;

  if (!hasSociety) {
    return (
      <div className="card p-12 text-center">
        <div className="w-16 h-16 bg-primary-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Building2 className="w-8 h-8 text-primary-500" />
        </div>
        <h3 className="text-lg font-semibold text-slate-800 mb-2">No Society Selected</h3>
        <p className="text-slate-500 text-sm mb-6">Select a society from the Societies page to manage its data.</p>
        <button onClick={() => navigate('/societies')} className="btn-primary">Go to Societies</button>
      </div>
    );
  }

  return <>{children}</>;
}
