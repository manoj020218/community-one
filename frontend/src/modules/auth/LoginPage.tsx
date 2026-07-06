import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Eye, EyeOff, Loader2, Shield } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { api, extractData } from '../../services/api';
import { User } from '../../types';
import toast from 'react-hot-toast';

export function LoginPage() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier || !password) return;
    setIsLoading(true);
    try {
      const data = await extractData<{ user: User; accessToken: string; refreshToken: string }>(
        api.post('/auth/login', { identifier, password })
      );
      setAuth(data.user, data.accessToken, data.refreshToken);
      toast.success(`Welcome back, ${data.user.name}!`);
      navigate('/dashboard');
    } catch {
      // Error toast handled by api interceptor
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-950 via-primary-900 to-purple-900 flex items-center justify-center p-4">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-primary-600/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white/10 backdrop-blur-sm rounded-2xl mb-4 border border-white/20">
            <Building2 className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white">Jenix Society One</h1>
          <p className="text-primary-300 mt-2 text-sm">Modular Society Management Platform</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-3xl shadow-2xl p-8">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-slate-900">Sign In</h2>
            <p className="text-slate-500 text-sm mt-1">Enter your credentials to access the platform</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Email or Mobile</label>
              <input type="text" value={identifier} onChange={(e) => setIdentifier(e.target.value)} placeholder="admin@jenix.in or 9999999999" className="input" required autoFocus />
            </div>

            <div>
              <label className="label">Password</label>
              <div className="relative">
                <input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter your password" className="input pr-12" required />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={isLoading} className="w-full btn-primary py-3 text-base flex items-center justify-center gap-2 mt-6">
              {isLoading ? <><Loader2 className="w-5 h-5 animate-spin" /> Signing in...</> : 'Sign In'}
            </button>
          </form>

          <div className="mt-6 p-4 bg-slate-50 rounded-xl">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="w-4 h-4 text-primary-600" />
              <span className="text-xs font-semibold text-slate-700">Demo Credentials</span>
            </div>
            <p className="text-xs text-slate-500">Email: admin@jenix.in</p>
            <p className="text-xs text-slate-500">Password: Admin@123</p>
          </div>
        </div>

        <p className="text-center text-primary-400 text-xs mt-6">
          Jenix Society One v1.0.0 — Built for 10-year production life
        </p>
      </div>
    </div>
  );
}
