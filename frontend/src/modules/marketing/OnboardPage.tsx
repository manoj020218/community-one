import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Building2, User, Mail, Phone, ArrowRight,
  CheckCircle2, Copy, Check, AlertCircle, Loader2, Eye, EyeOff, Tag,
} from 'lucide-react';
import { api } from '../../services/api';

const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa',
  'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala',
  'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland',
  'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura',
  'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Andaman and Nicobar Islands', 'Chandigarh', 'Delhi', 'Jammu and Kashmir',
  'Ladakh', 'Lakshadweep', 'Puducherry',
];

const BLANK = {
  societyName: '', address: '', city: '', state: '', pincode: '',
  contactPersonName: '', email: '', mobile: '', agentCode: '',
};

interface SuccessData {
  societyName: string;
  societyCode: string;
  email: string;
  password: string;
  trialEndsAt: string;
}

export function OnboardPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState(BLANK);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState<SuccessData | null>(null);
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [copiedPass, setCopiedPass] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const set = (k: keyof typeof BLANK) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const copyToClipboard = async (text: string, type: 'email' | 'pass') => {
    await navigator.clipboard.writeText(text);
    if (type === 'email') { setCopiedEmail(true); setTimeout(() => setCopiedEmail(false), 2000); }
    else { setCopiedPass(true); setTimeout(() => setCopiedPass(false), 2000); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.post('/auth/onboard-society', {
        societyName: form.societyName,
        address: form.address,
        city: form.city,
        state: form.state,
        pincode: form.pincode,
        contactPersonName: form.contactPersonName,
        email: form.email,
        mobile: form.mobile,
        agentCode: form.agentCode || undefined,
      });
      setSuccess((res.data as any).data);
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message || 'Registration failed. Please try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const goToLogin = () => {
    if (success) {
      navigate('/login', { state: { prefillEmail: success.email, prefillPassword: success.password } });
    } else {
      navigate('/login');
    }
  };

  // ─── Success Screen ────────────────────────────────────────────────────────
  if (success) {
    return (
      <div className="pt-16 min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-purple-950 flex items-center justify-center p-4">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-600/15 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-purple-600/15 rounded-full blur-3xl" />
        </div>

        <div className="relative w-full max-w-md">
          {/* Success badge */}
          <div className="text-center mb-6">
            <div className="inline-flex w-16 h-16 items-center justify-center bg-emerald-500 rounded-2xl shadow-lg mb-4">
              <CheckCircle2 className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-black text-white">Society Registered!</h1>
            <p className="text-white/60 text-sm mt-1">
              <span className="text-white font-semibold">{success.societyName}</span> is now on Jenix Community One
            </p>
          </div>

          <div className="bg-white rounded-3xl shadow-2xl p-8 space-y-5">
            {/* Society info */}
            <div className="bg-primary-50 border border-primary-100 rounded-xl p-4">
              <p className="text-xs text-primary-500 font-semibold uppercase tracking-wider mb-1">Society Code</p>
              <p className="font-mono font-bold text-primary-700 text-lg">{success.societyCode}</p>
              <p className="text-xs text-primary-500 mt-1">
                Trial active until{' '}
                <span className="font-semibold text-primary-700">
                  {new Date(success.trialEndsAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                </span>
              </p>
            </div>

            {/* Credentials */}
            <div>
              <p className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                <span className="w-5 h-5 bg-indigo-100 text-indigo-600 rounded-md flex items-center justify-center text-xs font-black">🔑</span>
                Your Login Credentials
              </p>

              {/* Email */}
              <div className="mb-3">
                <p className="text-xs text-slate-500 font-medium mb-1">Email</p>
                <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
                  <span className="flex-1 font-mono text-sm text-slate-800 break-all">{success.email}</span>
                  <button
                    onClick={() => copyToClipboard(success.email, 'email')}
                    className="text-slate-400 hover:text-primary-600 transition-colors flex-shrink-0"
                    title="Copy email"
                  >
                    {copiedEmail ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Password */}
              <div>
                <p className="text-xs text-slate-500 font-medium mb-1">Password</p>
                <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
                  <span className="flex-1 font-mono text-sm text-slate-800 break-all">
                    {showPass ? success.password : '••••••••••••'}
                  </span>
                  <button onClick={() => setShowPass((s) => !s)} className="text-slate-400 hover:text-slate-600 flex-shrink-0">
                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => copyToClipboard(success.password, 'pass')}
                    className="text-slate-400 hover:text-primary-600 transition-colors flex-shrink-0"
                    title="Copy password"
                  >
                    {copiedPass ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            {/* Warning */}
            <div className="flex gap-3 p-3.5 bg-amber-50 border border-amber-100 rounded-xl">
              <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-800 leading-relaxed">
                <strong>Save your password now.</strong> We're sending your credentials to your registered email and mobile via our system.
                You can change your password after logging in.
              </p>
            </div>

            {/* Login button */}
            <button
              onClick={goToLogin}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-gradient-to-r from-primary-600 to-purple-600 text-white font-bold text-base hover:opacity-90 transition-opacity shadow-lg"
            >
              Login to Your Society <ArrowRight className="w-5 h-5" />
            </button>

            <p className="text-center text-xs text-slate-400">
              Questions?{' '}
              <a href="mailto:support@iotsoft.in" className="text-primary-600 hover:underline">support@iotsoft.in</a>
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ─── Registration Form ─────────────────────────────────────────────────────
  return (
    <div className="pt-16">
      {/* Hero */}
      <section className="bg-gradient-to-br from-slate-900 via-indigo-950 to-purple-950 text-white py-16">
        <div className="max-w-2xl mx-auto px-4 text-center">
          <div className="inline-flex w-14 h-14 items-center justify-center bg-white/10 rounded-2xl border border-white/20 mb-5">
            <Building2 className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-black mb-3">Register Your Society</h1>
          <p className="text-white/65 text-base">
            Get 6 months free access to Jenix Community One. Your credentials will be created instantly.
          </p>
        </div>
      </section>

      {/* Form */}
      <section className="py-12 bg-slate-50">
        <div className="max-w-2xl mx-auto px-4">
          <form onSubmit={handleSubmit} className="space-y-8">

            {/* Section 1: Society Details */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-primary-600" />
                <h2 className="font-semibold text-slate-800 text-sm">Society Information</h2>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="label">Society Name <span className="text-red-500">*</span></label>
                  <input value={form.societyName} onChange={set('societyName')} required placeholder="e.g. Blue Diamond Heights" className="input" />
                </div>
                <div>
                  <label className="label">Full Address <span className="text-red-500">*</span></label>
                  <textarea value={form.address} onChange={set('address')} required placeholder="Plot no., Street, Locality" className="input resize-none" rows={2} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">City <span className="text-red-500">*</span></label>
                    <input value={form.city} onChange={set('city')} required placeholder="Mumbai" className="input" />
                  </div>
                  <div>
                    <label className="label">Pincode <span className="text-red-500">*</span></label>
                    <input value={form.pincode} onChange={set('pincode')} required placeholder="400001" className="input" maxLength={6} pattern="[0-9]{6}" />
                  </div>
                </div>
                <div>
                  <label className="label">State <span className="text-red-500">*</span></label>
                  <select value={form.state} onChange={set('state')} required className="input">
                    <option value="">Select state...</option>
                    {INDIAN_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
            </div>

            {/* Section 2: Contact Person */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
                <User className="w-4 h-4 text-emerald-600" />
                <h2 className="font-semibold text-slate-800 text-sm">Society Admin Details</h2>
                <span className="text-xs text-slate-400 ml-1">(you — the person managing this platform)</span>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="label">Full Name <span className="text-red-500">*</span></label>
                  <input value={form.contactPersonName} onChange={set('contactPersonName')} required placeholder="Rajesh Sharma" className="input" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Email Address <span className="text-red-500">*</span></label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input type="email" value={form.email} onChange={set('email')} required placeholder="raj@example.com" className="input pl-9" />
                    </div>
                    <p className="text-xs text-slate-400 mt-1">This becomes your login email</p>
                  </div>
                  <div>
                    <label className="label">Mobile Number <span className="text-red-500">*</span></label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input type="tel" value={form.mobile} onChange={set('mobile')} required placeholder="9876543210" className="input pl-9" maxLength={10} pattern="[0-9]{10}" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Section 3: Agent Code (optional) */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
                <Tag className="w-4 h-4 text-purple-600" />
                <h2 className="font-semibold text-slate-800 text-sm">Agent Code</h2>
                <span className="text-xs text-slate-400 ml-1">(optional)</span>
              </div>
              <div className="p-6">
                <input value={form.agentCode} onChange={set('agentCode')} placeholder="Enter agent code if referred by a Jenix agent" className="input" />
                <p className="text-xs text-slate-400 mt-2">
                  Leave blank if you found us directly. Agents have a unique code provided by Jenix.
                </p>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="flex gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-700 leading-relaxed">{error}</p>
              </div>
            )}

            {/* Submit */}
            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-4 rounded-xl bg-gradient-to-r from-primary-600 to-purple-600 text-white font-bold text-base hover:opacity-90 transition-opacity shadow-lg disabled:opacity-60"
              >
                {loading ? (
                  <><Loader2 className="w-5 h-5 animate-spin" /> Registering your society...</>
                ) : (
                  <><Building2 className="w-5 h-5" /> Register Society &amp; Get Credentials</>
                )}
              </button>

              <div className="mt-4 text-center space-y-1">
                <p className="text-xs text-slate-500 flex items-center justify-center gap-4">
                  <span className="flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> 6 months free</span>
                  <span className="flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> No credit card</span>
                  <span className="flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Instant access</span>
                </p>
                <p className="text-xs text-slate-400">
                  Already registered?{' '}
                  <Link to="/login" className="text-primary-600 hover:underline font-medium">Login here →</Link>
                </p>
              </div>
            </div>
          </form>
        </div>
      </section>
    </div>
  );
}
