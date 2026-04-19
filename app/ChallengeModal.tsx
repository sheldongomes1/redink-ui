'use client';

// Modal that captures a challenge against a specific rail-card section.
// Assumes the user is already signed in (gated by the landing page).
import { useEffect, useState } from 'react';
import { useAuthGate } from '@/lib/useAuth';
import { isFirebaseConfigured } from '@/lib/firebase';
import { saveChallenge, type ChallengeSection } from '@/lib/comments';
import { capture } from '@/lib/posthog';

const MIN_COMMENT_LEN = 10;

const SECTION_LABEL: Record<ChallengeSection, string> = {
  conviction: 'Conviction',
  drivers:    'Top drivers',
  pattern:    'Pattern',
  eval:       'AI Quality Check',
};

interface Props {
  open: boolean;
  section: ChallengeSection | null;
  ticker: string;
  anomaly_score: number;
  report_date: string;
  onClose: () => void;
}

export default function ChallengeModal({ open, section, ticker, anomaly_score, report_date, onClose }: Props) {
  const { user } = useAuthGate();
  const [comment, setComment]     = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const configured = isFirebaseConfigured();

  useEffect(() => {
    if (open) { setComment(''); setError(null); }
  }, [open, section, ticker, report_date]);

  if (!open || !section) return null;

  const handleSubmit = async () => {
    if (!user) { setError('You must be signed in to submit a challenge.'); return; }
    const trimmed = comment.trim();
    if (trimmed.length < MIN_COMMENT_LEN) {
      setError(`Comment must be at least ${MIN_COMMENT_LEN} characters.`);
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await saveChallenge({
        ticker, anomaly_score, report_date,
        section,
        comment_text: trimmed,
        user_email: user.email || '',
        user_name:  user.displayName || user.email || 'Unknown',
        user_photo: user.photoURL || null,
        user_uid:   user.uid,
      });
      capture('section_challenged', {
        ticker, anomaly_score, section,
        comment_length: trimmed.length,
      });
      onClose();
    } catch (e: any) {
      setError(e?.message || 'Failed to save challenge');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(17, 24, 39, 0.45)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        width: 'min(480px, calc(100vw - 32px))',
        background: '#fff', borderRadius: 14, boxShadow: '0 20px 40px rgba(0,0,0,0.18)',
        padding: 24, fontFamily: 'inherit',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: '#111827' }}>
            Challenge: {SECTION_LABEL[section]}
          </div>
          <button onClick={onClose} style={{
            width: 28, height: 28, borderRadius: 8, border: '1px solid #e5e7eb',
            background: '#fff', color: '#6b7280', fontSize: 18, lineHeight: 1,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>×</button>
        </div>
        <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 16 }}>
          {ticker} · {report_date} · score {anomaly_score.toFixed(1)}
        </div>

        {!configured && (
          <div style={{
            padding: '10px 12px', borderRadius: 8, background: '#fef2f2',
            border: '1px solid #fecaca', color: '#b91c1c', fontSize: 12, marginBottom: 12,
          }}>
            Firebase isn&apos;t configured. Add <code>NEXT_PUBLIC_FIREBASE_*</code> env vars to <code>.env.local</code> and restart the dev server.
          </div>
        )}

        {configured && user && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              {user.photoURL && (
                <img src={user.photoURL} alt="" width={28} height={28} style={{ borderRadius: '50%' }} />
              )}
              <div style={{ fontSize: 12, color: '#374151' }}>
                Challenging as <strong style={{ color: '#111827' }}>{user.displayName || user.email}</strong>
              </div>
            </div>
            <textarea
              value={comment}
              onChange={e => setComment(e.target.value)}
              placeholder={`What's wrong with the ${SECTION_LABEL[section]} reasoning?`}
              rows={4}
              autoFocus
              style={{
                width: '100%', padding: '10px 12px',
                border: '1px solid #e5e7eb', borderRadius: 8,
                fontSize: 13, color: '#111827', fontFamily: 'inherit',
                resize: 'vertical',
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
              <div style={{ fontSize: 11, color: comment.trim().length >= MIN_COMMENT_LEN ? '#16a34a' : '#9ca3af' }}>
                {comment.trim().length}/{MIN_COMMENT_LEN} characters min
              </div>
              <button onClick={handleSubmit} disabled={submitting || comment.trim().length < MIN_COMMENT_LEN} style={{
                padding: '8px 18px', borderRadius: 8,
                background: submitting || comment.trim().length < MIN_COMMENT_LEN ? '#e5e7eb' : '#C04830',
                color: submitting || comment.trim().length < MIN_COMMENT_LEN ? '#9ca3af' : '#fff',
                fontSize: 12, fontWeight: 600, border: 'none',
                cursor: submitting || comment.trim().length < MIN_COMMENT_LEN ? 'not-allowed' : 'pointer',
              }}>
                {submitting ? 'Sending…' : 'Submit challenge'}
              </button>
            </div>
          </div>
        )}

        {error && (
          <div style={{ marginTop: 12, fontSize: 12, color: '#b91c1c' }}>{error}</div>
        )}
      </div>
    </div>
  );
}
