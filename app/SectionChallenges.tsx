'use client';

// Presentational — shown below each rail card. Data comes from a single
// per-row Firestore subscription owned by the parent (app/app/page.tsx) to
// avoid Firestore SDK target-state races caused by many concurrent listeners.
import type { ReviewComment } from '@/lib/comments';

function formatDate(d: Date | null): string {
  if (!d) return '';
  return d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

export default function SectionChallenges({ comments }: { comments: ReviewComment[] }) {
  if (!comments || comments.length === 0) return null;

  return (
    <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px dashed #e5e7eb', display: 'flex', flexDirection: 'column', gap: 8 }}>
      {comments.map(c => (
        <div key={c.id}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
            {c.user_photo ? (
              <img src={c.user_photo} alt="" width={14} height={14} style={{ borderRadius: '50%' }} />
            ) : (
              <div style={{ width: 14, height: 14, borderRadius: '50%', background: '#f3f4f6', border: '1px solid #e5e7eb' }} />
            )}
            <div style={{ fontSize: 10, fontWeight: 500, color: '#6b7280' }}>{c.user_name}</div>
            <div style={{ fontSize: 10, color: '#9ca3af' }}>· {formatDate(c.created_at)}</div>
          </div>
          <div style={{ fontSize: 11, color: '#4B4540', lineHeight: 1.5, whiteSpace: 'pre-wrap', paddingLeft: 20 }}>
            {c.comment_text}
          </div>
        </div>
      ))}
    </div>
  );
}
