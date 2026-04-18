// Shared auth-state hook. Persists automatically via Firebase default (localStorage).
import { useEffect, useState } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { getFirebaseAuth, isFirebaseConfigured } from './firebase';

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

  useEffect(() => {
    if (DEV_BYPASS) return;
    if (!isFirebaseConfigured()) { setStatus('unconfigured'); return; }
    const auth = getFirebaseAuth();
    if (!auth) { setStatus('unconfigured'); return; }
    return onAuthStateChanged(auth, u => {
      setUser(u);
      setStatus(u ? 'authed' : 'unauthed');
    });
  }, []);

  return { status, user };
}
