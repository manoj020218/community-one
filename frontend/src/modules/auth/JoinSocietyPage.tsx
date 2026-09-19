import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { KeyRound, Building2, CheckCircle2, ArrowLeft, Loader2, Clock3 } from 'lucide-react';
import { api } from '../../services/api';
import toast from 'react-hot-toast';

type Step = 'code' | 'confirm' | 'details' | 'done';

const BLANK_DETAILS = { name: '', mobile: '', email: '', claimedFlatNo: '' };

export function JoinSocietyPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('code');
  const [code, setCode] = useState('');
  const [societyName, setSocietyName] = useState('');
  const [details, setDetails] = useState(BLANK_DETAILS);
  const [isLoading, setIsLoading] = useState(false);

  const lookupCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;
    setIsLoading(true);
    try {
      const res = await api.post('/join-requests/lookup-society', { code: code.trim() }, { skipErrorToast: true } as any);
      setSocietyName(res.data.data.name);
      setStep('confirm');
    } catch (err: any) {
      toast.error(err?.response?.data?.error?.message || "That code doesn't match any society. Double-check it with your society admin.");
    } finally {
      setIsLoading(false);
    }
  };

  const submitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!details.name || !details.mobile) return;
    setIsLoading(true);
    try {
      await api.post('/join-requests', { societyCode: code.trim(), ...details }, { skipErrorToast: true } as any);
      setStep('done');
    } catch (err: any) {
      toast.error(err?.response?.data?.error?.message || 'Could not submit your request. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const startOver = () => {
    setStep('code');
    setCode('');
    setSocietyName('');
    setDetails(BLANK_DETAILS);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-950 via-primary-900 to-purple-900 flex items-center justify-center p-4 safe-area-top safe-area-bottom">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-primary-600/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white/10 backdrop-blur-sm rounded-2xl mb-4 border border-white/20">
            <KeyRound className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white">Join Your Society</h1>
          <p className="text-primary-300 mt-2 text-sm">Use the code your society admin shared with you</p>
        </div>

        <div className="bg-white rounded-3xl shadow-2xl p-8">
          {step === 'code' && (
            <form onSubmit={lookupCode} className="space-y-4">
              <div>
                <label className="label">Society Code</label>
                <input
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="e.g. BLUEDIAMOND1234"
                  className="input font-mono tracking-wide"
                  required
                  autoFocus
                />
                <p className="mt-1 text-xs text-slate-400">Ask your society admin for this code if you don't have it.</p>
              </div>
              <button type="submit" disabled={isLoading} className="w-full btn-primary py-3 text-base flex items-center justify-center gap-2 mt-2">
                {isLoading ? <><Loader2 className="w-5 h-5 animate-spin" /> Checking...</> : 'Continue'}
              </button>
            </form>
          )}

          {step === 'confirm' && (
            <div className="space-y-5">
              <div className="p-4 bg-primary-50 border border-primary-100 rounded-xl text-center">
                <Building2 className="w-6 h-6 text-primary-600 mx-auto mb-2" />
                <p className="text-xs text-primary-500 font-semibold uppercase tracking-wider mb-1">Is this your society?</p>
                <p className="text-lg font-bold text-primary-800">{societyName}</p>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setStep('details')} className="btn-primary flex-1">Yes, continue</button>
                <button onClick={startOver} className="btn-secondary">Not this one</button>
              </div>
            </div>
          )}

          {step === 'details' && (
            <form onSubmit={submitRequest} className="space-y-4">
              <button type="button" onClick={() => setStep('confirm')} className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 mb-1">
                <ArrowLeft className="w-3 h-3" /> Back
              </button>
              <div>
                <label className="label">Your Full Name</label>
                <input value={details.name} onChange={(e) => setDetails((d) => ({ ...d, name: e.target.value }))} placeholder="Raj Sharma" className="input" required autoFocus />
              </div>
              <div>
                <label className="label">Mobile Number</label>
                <input value={details.mobile} onChange={(e) => setDetails((d) => ({ ...d, mobile: e.target.value }))} placeholder="9876543210" className="input" type="tel" required maxLength={10} pattern="[0-9]{10}" />
              </div>
              <div>
                <label className="label">Email <span className="text-slate-400 font-normal">(optional)</span></label>
                <input value={details.email} onChange={(e) => setDetails((d) => ({ ...d, email: e.target.value }))} placeholder="raj@example.com" className="input" type="email" />
              </div>
              <div>
                <label className="label">Your Flat/Unit Number <span className="text-slate-400 font-normal">(optional)</span></label>
                <input value={details.claimedFlatNo} onChange={(e) => setDetails((d) => ({ ...d, claimedFlatNo: e.target.value }))} placeholder="e.g. A-204" className="input" />
                <p className="mt-1 text-xs text-slate-400">Helps your admin find your record faster — not required.</p>
              </div>
              <button type="submit" disabled={isLoading || !details.name || !details.mobile} className="w-full btn-primary py-3 text-base flex items-center justify-center gap-2 mt-2">
                {isLoading ? <><Loader2 className="w-5 h-5 animate-spin" /> Submitting...</> : 'Request to Join'}
              </button>
            </form>
          )}

          {step === 'done' && (
            <div className="space-y-5 text-center">
              <div className="inline-flex w-14 h-14 items-center justify-center bg-emerald-100 rounded-2xl mx-auto">
                <CheckCircle2 className="w-7 h-7 text-emerald-600" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">Request Submitted</h2>
                <p className="text-sm text-slate-500 mt-1">
                  Your society admin has been notified. Once approved, they'll share your login details with you directly.
                </p>
              </div>
              <div className="flex items-center gap-2 justify-center text-xs text-slate-400 bg-slate-50 rounded-xl py-2.5 px-4">
                <Clock3 className="w-3.5 h-3.5" /> Usually reviewed within a day or two
              </div>
              <button onClick={() => navigate('/login')} className="btn-primary w-full">Back to Login</button>
            </div>
          )}

          {step !== 'done' && (
            <div className="mt-6 text-center">
              <p className="text-sm text-slate-500">
                Already have a login? <Link to="/login" className="text-primary-600 font-semibold hover:underline">Sign in →</Link>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
