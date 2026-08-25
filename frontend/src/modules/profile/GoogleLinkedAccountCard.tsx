import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Mail, Unlink } from 'lucide-react';
import toast from 'react-hot-toast';
import { api, extractData } from '../../services/api';
import { GoogleSignInButton } from '../../components/GoogleSignInButton';
import { useAuthStore } from '../../store/authStore';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;

export function GoogleLinkedAccountCard() {
  const { user, updateUser } = useAuthStore();
  const [linking, setLinking] = useState(false);

  const linkMutation = useMutation({
    mutationFn: (idToken: string) => extractData<{ linkedGoogleEmail: string }>(api.post('/auth/google/link', { idToken })),
    onSuccess: (data) => {
      updateUser({ linkedGoogleEmail: data.linkedGoogleEmail });
      toast.success('Google account linked — you can now sign in with Google too');
    },
    onSettled: () => setLinking(false),
  });

  const unlinkMutation = useMutation({
    mutationFn: () => api.post('/auth/google/unlink'),
    onSuccess: () => {
      updateUser({ linkedGoogleEmail: undefined });
      toast.success('Google account unlinked');
    },
  });

  if (!GOOGLE_CLIENT_ID) return null;

  return (
    <div className="card p-6">
      <div className="flex items-center gap-2 mb-4"><Mail className="w-4 h-4 text-slate-400" /><h3 className="font-semibold text-slate-700 text-sm">Linked Google Account</h3></div>
      {user?.linkedGoogleEmail ? (
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-slate-700">{user.linkedGoogleEmail}</p>
            <p className="text-xs text-slate-500">You can sign in with either this Google account or your password.</p>
          </div>
          <button onClick={() => unlinkMutation.mutate()} disabled={unlinkMutation.isPending} className="btn-secondary text-sm flex items-center gap-1.5 shrink-0">
            <Unlink className="w-3.5 h-3.5" /> Unlink
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-slate-500">Link a Gmail account for a faster sign-in next time — no password to remember.</p>
          <div className="max-w-xs">
            {linking ? (
              <p className="text-sm text-slate-400">Linking…</p>
            ) : (
              <GoogleSignInButton
                clientId={GOOGLE_CLIENT_ID}
                onCredential={(idToken) => { setLinking(true); linkMutation.mutate(idToken); }}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
