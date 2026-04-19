'use client';

// Inline "General feedback" card — product-level feedback, not tied to a row.
// Lives at the bottom of the right rail.
import { useState } from 'react';
import { useAuthGate } from '@/lib/useAuth';
import { saveFeedback } from '@/lib/feedback';
import { capture } from '@/lib/posthog';

const MIN_LEN = 8;

export default function FeedbackCard() {
  const { user } = useAuthGate();
  const [text, setText]         = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sentMessage, setSentMessage] = useState<string | null>(null);
  const [error, setError]       = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!user) { setError('Sign in to send feedback.'); return; }
    const trimmed = text.trim();
    if (trimmed.length < MIN_LEN) { setError(`Feedback must be at least ${MIN_LEN} characters.`); return; }
    setSubmitting(true);
    setError(null);
    try {
      await saveFeedback({
        text: trimmed,
        user_email: user.email || '',
        user_name:  user.displayName || user.email || 'Unknown',
        user_photo: user.photoURL || null,
        user_uid:   user.uid,
      });
      capture('feedback_submitted', { text_length: trimmed.length });
      setText('');
      setSentMessage('Thanks — feedback received.');
      setTimeout(() => setSentMessage(null), 3500);
    } catch (e: any) {
      setError(e?.message || 'Failed to send feedback');
    } finally {
      setSubmitting(false);
    }
  };

  const ready = text.trim().length >= MIN_LEN && !submitting;

  return (
    <div className="rail-card">
      <div className="rail-card-title">
        <span>Feedback</span>
      </div>
      <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 8, lineHeight: 1.5 }}>
        Feature requests, bugs, or anything that would make this tool more useful for your workflow.
      </div>
      <textarea
        value={text}
        onChange={e => setText(e.target.value)}
        placeholder="Share an idea or issue…"
        rows={3}
        disabled={submitting}
        style={{
          width: '100%', padding: '8px 10px',
          border: '1px solid #e5e7eb', borderRadius: 8,
          fontSize: 12, color: '#111827', fontFamily: 'inherit',
          resize: 'vertical', background: '#fff',
        }}
      />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
        <div style={{ fontSize: 10, color: sentMessage ? '#16a34a' : error ? '#b91c1c' : '#9ca3af' }}>
          {sentMessage || error || (text.trim().length >= MIN_LEN ? 'Ready to send' : `${text.trim().length}/${MIN_LEN} min`)}
        </div>
        <button onClick={handleSubmit} disabled={!ready} style={{
          padding: '6px 14px', borderRadius: 7,
          background: ready ? '#635bff' : '#e5e7eb',
          color: ready ? '#fff' : '#9ca3af',
          fontSize: 11, fontWeight: 600, border: 'none',
          cursor: ready ? 'pointer' : 'not-allowed',
        }}>
          {submitting ? 'Sending…' : 'Send'}
        </button>
      </div>
    </div>
  );
}
