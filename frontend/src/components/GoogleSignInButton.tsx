/**
 * Google sign-in, split by platform:
 * - Native (Capacitor/Android): Google's own Identity Services web widget is
 *   explicitly unsupported inside embedded WebViews (it detects the WebView
 *   user-agent and silently refuses to render, as an anti-phishing measure —
 *   this isn't a bug, it's documented Google policy). So on native we use the
 *   native Google Sign-In SDK via @capacitor-firebase/authentication instead,
 *   which opens the real system account picker. Since we render this button
 *   ourselves (not an iframe Google controls), it can actually match the
 *   app's own button styling exactly.
 * - Web: unchanged — Google's rendered GIS button, loaded on demand.
 */
import { useEffect, useRef, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { FirebaseAuthentication } from '@capacitor-firebase/authentication';
import { Loader2 } from 'lucide-react';

interface GoogleCredentialResponse {
  credential: string;
}

interface Props {
  clientId: string;
  onCredential: (idToken: string) => void;
}

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (cfg: {
            client_id: string;
            callback: (r: GoogleCredentialResponse) => void;
          }) => void;
          renderButton: (el: HTMLElement, opts: Record<string, unknown>) => void;
        };
      };
    };
  }
}

const SRC = 'https://accounts.google.com/gsi/client';

function loadGis(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.google?.accounts?.id) return resolve();
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${SRC}"]`);
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error('gis load error')));
      return;
    }
    const s = document.createElement('script');
    s.src = SRC;
    s.async = true;
    s.defer = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('gis load error'));
    document.head.appendChild(s);
  });
}

function GoogleLogo() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.81.54-1.84.87-3.04.87-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18z" />
      <path fill="#FBBC05" d="M3.97 10.73A5.4 5.4 0 0 1 3.68 9c0-.6.1-1.18.29-1.73V4.94H.96A9 9 0 0 0 0 9c0 1.45.35 2.83.96 4.06l3.01-2.33z" />
      <path fill="#EA4335" d="M9 3.58c1.32 0 2.51.46 3.44 1.35l2.59-2.59C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.94l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58z" />
    </svg>
  );
}

function NativeGoogleButton({ onCredential }: { onCredential: (idToken: string) => void }) {
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    setLoading(true);
    try {
      const result = await FirebaseAuthentication.signInWithGoogle();
      const idToken = result.credential?.idToken;
      if (idToken) onCredential(idToken);
    } catch {
      // User cancelled or sign-in failed — nothing to surface here, the
      // caller's own request flow handles/toasts real backend errors.
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      className="w-full flex items-center justify-center gap-2.5 py-3 rounded-lg border border-slate-300 bg-white text-slate-700 font-medium text-sm hover:bg-slate-50 transition-colors disabled:opacity-60"
    >
      {loading ? <Loader2 className="w-[18px] h-[18px] animate-spin" /> : <GoogleLogo />}
      {loading ? 'Signing in...' : 'Sign in with Google'}
    </button>
  );
}

function WebGoogleButton({ clientId, onCredential }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    loadGis()
      .then(() => {
        if (cancelled || !ref.current || !window.google) return;
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: (r) => onCredential(r.credential),
        });
        window.google.accounts.id.renderButton(ref.current, {
          theme: 'filled_black',
          size: 'large',
          text: 'signin_with',
          shape: 'rectangular',
          logo_alignment: 'center',
          width: ref.current.clientWidth || 300,
        });
      })
      .catch(() => {
        /* offline or blocked — button just won't render */
      });
    return () => {
      cancelled = true;
    };
  }, [clientId, onCredential]);

  return <div ref={ref} className="flex justify-center" />;
}

export function GoogleSignInButton({ clientId, onCredential }: Props) {
  if (Capacitor.isNativePlatform()) {
    return <NativeGoogleButton onCredential={onCredential} />;
  }
  return <WebGoogleButton clientId={clientId} onCredential={onCredential} />;
}
