// Shared auth-state hook. Persists automatically via Firebase default (localStorage).
import { useEffect, useRef, useState } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { getFirebaseAuth, isFirebaseConfigured } from './firebase';
import { identify, resetPostHog, capture } from './posthog';

export type AuthStatus = 'loading' | 'authed' | 'unauthed' | 'unconfigured';

export interface AuthGate {
  status: AuthStatus;
  user: User | null;
}

// Dev-only bypass: when NEXT_PUBLIC_DEV_BYPASS_AUTH is "true", return a mock
// signed-in user without touching Firebase. Used for the design-audit screenshot
// run; inert in prod because the env var is not set.
const DEV_BYPASS = process.env.NEXT_PUBLIC_DEV_BYPASS_AUTH === 'true';
const MOCK_USER = {
  uid: 'dev-bypass-uid',
  email: 'design-audit@redink.local',
  displayName: 'Design Audit',
  photoURL: null,
} as unknown as User;

export function useAuthGate(): AuthGate {
  const [status, setStatus] = useState<AuthStatus>(DEV_BYPASS ? 'authed' : 'loading');
  const [user, setUser] = useState<User | null>(DEV_BYPASS ? MOCK_USER : null);
  const prevUidRef = useRef<string | null>(null);

  useEffect(() => {
    if (DEV_BYPASS) return;
    if (!isFirebaseConfigured()) { setStatus('unconfigured'); return; }
    const auth = getFirebaseAuth();
    if (!auth) { setStatus('unconfigured'); return; }
    return onAuthStateChanged(auth, u => {
      setUser(u);
      setStatus(u ? 'authed' : 'unauthed');

      const prevUid = prevUidRef.current;
      if (u && u.uid !== prevUid) {
        identify(u.email ?? u.uid, {
          email: u.email,
          name: u.displayName,
          uid: u.uid,
        });
        // Only fire login_success on a real null → user transition, not session
        // restoration from localStorage on page reload.
        if (prevUid === null && !sessionStorage.getItem('ph_session_identified')) {
          capture('login_success', { provider: 'google' });
          sessionStorage.setItem('ph_session_identified', '1');
        }
      } else if (!u && prevUid !== null) {
        resetPostHog();
        sessionStorage.removeItem('ph_session_identified');
      }
      prevUidRef.current = u?.uid ?? null;
    });
  }, []);

  return { status, user };
}
