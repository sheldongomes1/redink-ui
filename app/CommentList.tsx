'use client';

// Live list of reviewer comments for a single anomaly (ticker + report_date).
// Subtle styling: analyst data stays the primary focus.
import { useEffect, useState } from 'react';
import { isFirebaseConfigured } from '@/lib/firebase';
import { subscribeToComments, type ReviewComment } from '@/lib/comments';

function formatDate(d: Date | null): string {
  if (!d) return '';
  return d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

export default function CommentList({ ticker, report_date }: { ticker: string; report_date: string }) {
  const [comments, setComments] = useState<ReviewComment[]>([]);

  useEffect(() => {
    if (!isFirebaseConfigured()) return;
    const unsub = subscribeToComments(ticker, report_date, setComments);
    return () => unsub();
  }, [ticker, report_date]);

  if (comments.length === 0) return null;

  return (
    <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid #f3f4f6' }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>
        Reviewer comments · {comments.length}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {comments.map(c => (
          <div key={c.id} style={{
            padding: '10px 12px',
            background: '#fafafa',
            border: '1px solid #f3f4f6',
            borderRadius: 8,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              {c.user_photo && (
                <img src={c.user_photo} alt="" width={20} height={20} style={{ borderRadius: '50%' }} />
              )}
              <div style={{ fontSize: 12, fontWeight: 500, color: '#111827' }}>{c.user_name}</div>
              <div style={{ fontSize: 11, color: '#9ca3af' }}>· {formatDate(c.created_at)}</div>
            </div>
            <div style={{ fontSize: 12, color: '#374151', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
              {c.comment_text}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
