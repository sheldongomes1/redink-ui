'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { signInWithGoogle, isFirebaseConfigured } from '@/lib/firebase';
import { useAuthGate } from '@/lib/useAuth';
import WarningIcon from './WarningIcon';

export default function Landing() {
  const router = useRouter();
  const { status } = useAuthGate();
  const [signingIn, setSigningIn] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'authed') router.replace('/app');
  }, [status, router]);

  const handleSignIn = async () => {
    setSigningIn(true);
    setError(null);
    try {
      await signInWithGoogle();
    } catch (e: any) {
      setError(e?.message || 'Sign-in failed');
      setSigningIn(false);
    }
  };

  return (
    <main style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'radial-gradient(ellipse at center, #fdfcfa 0%, #f5f0eb 100%)',
      padding: '24px',
    }}>
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 40,
        width: '100%',
        maxWidth: 840,
      }}>
        {/* Logo — integrated lockup, scaled up */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
          <img src="/logo/redink-logo.svg" alt="RedInk — when the story stops matching the numbers" style={{ display: 'block', width: '100%', maxWidth: 840, height: 'auto' }} />
        </div>

        {/* Sign-in card */}
        <div style={{
          width: '100%',
          maxWidth: 520,
          background: '#ffffff',
          border: '1px solid #EAE4DD',
          borderRadius: 14,
          padding: '28px 28px 24px',
          boxShadow: '0 1px 3px rgba(26, 24, 22, 0.04), 0 8px 24px rgba(26, 24, 22, 0.06)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 16,
        }}>
          <div style={{ fontSize: 13, color: '#4B4540', textAlign: 'center', lineHeight: 1.5 }}>
            Sign in to start reviewing anomalies across QQQ company filings
          </div>

          {status === 'unconfigured' ? (
            <div style={{
              width: '100%',
              padding: '12px 14px',
              fontSize: 12,
              background: '#fef2f2',
              color: '#b91c1c',
              border: '1px solid #fecaca',
              borderRadius: 8,
              lineHeight: 1.5,
            }}>
              Firebase isn&apos;t configured yet. Add <code>NEXT_PUBLIC_FIREBASE_*</code> values to <code>.env.local</code> and restart the dev server.
            </div>
          ) : (
            <button
              onClick={handleSignIn}
              disabled={signingIn || status === 'loading'}
              style={{
                width: '100%',
                padding: '11px 16px',
                background: '#ffffff',
                color: '#1A1816',
                border: '1px solid #D4CCC2',
                borderRadius: 10,
                fontSize: 14,
                fontWeight: 500,
                cursor: signingIn || status === 'loading' ? 'wait' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
                transition: 'border-color 0.15s, box-shadow 0.15s',
              }}
              onMouseEnter={e => { (e.currentTarget.style.borderColor = '#C04830'); }}
              onMouseLeave={e => { (e.currentTarget.style.borderColor = '#D4CCC2'); }}
            >
              <GoogleMark />
              {signingIn ? 'Signing in…' : status === 'loading' ? 'Loading…' : 'Sign in with Google'}
            </button>
          )}

          {status !== 'unconfigured' && (
            <div style={{ fontSize: 11, color: '#8F8880', textAlign: 'center', lineHeight: 1.5 }}>
              By signing in, you agree to the{' '}
              <Link href="/terms" style={{ color: '#4B4540', textDecoration: 'underline', textUnderlineOffset: 2, textDecorationColor: '#D4CCC2' }}>
                Terms of Use
              </Link>
              .
            </div>
          )}

          {error && (
            <div style={{ fontSize: 12, color: '#b91c1c', textAlign: 'center' }}>{error}</div>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#4B4540', textAlign: 'center', lineHeight: 1.5, maxWidth: 520 }}>
          <WarningIcon size={15} />
          <span>For research and educational purposes only. Not investment advice.</span>
        </div>
      </div>
    </main>
  );
}

function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
      <path fill="none" d="M0 0h48v48H0z"/>
    </svg>
  );
}
