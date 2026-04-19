// Firestore-backed reviewer input.
// Supports per-section "Challenge" comments (section is "conviction" | "drivers" | "pattern").
// Legacy docs without a `section` field are row-level comments from the old UI.
import {
  addDoc, collection, limit, onSnapshot, orderBy, query, serverTimestamp, where,
  type DocumentData, type QueryDocumentSnapshot, type Timestamp,
} from 'firebase/firestore';
import { getFirebaseDb } from './firebase';

export type ChallengeSection = 'conviction' | 'drivers' | 'pattern' | 'eval';

export interface ReviewComment {
  id: string;
  ticker: string;
  anomaly_score: number;
  report_date: string;
  comment_text: string;
  user_email: string;
  user_name: string;
  user_photo: string | null;
  user_uid: string;
  status: string;
  section: ChallengeSection | null;
  created_at: Date | null;
}

export function commentKey(ticker: string, report_date: string) {
  return `${ticker}_${report_date}`;
}

function toComment(doc: QueryDocumentSnapshot<DocumentData>): ReviewComment {
  const d = doc.data();
  const ts = d.created_at as Timestamp | null | undefined;
  return {
    id:            doc.id,
    ticker:        d.ticker,
    anomaly_score: d.anomaly_score,
    report_date:   d.report_date,
    comment_text:  d.comment_text,
    user_email:    d.user_email,
    user_name:     d.user_name,
    user_photo:    d.user_photo ?? null,
    user_uid:      d.user_uid,
    status:        d.status,
    section:       d.section ?? null,
    created_at:    ts?.toDate ? ts.toDate() : null,
  };
}

export async function saveChallenge(payload: {
  ticker: string;
  anomaly_score: number;
  report_date: string;
  section: ChallengeSection;
  comment_text: string;
  user_email: string;
  user_name: string;
  user_photo: string | null;
  user_uid: string;
}): Promise<void> {
  const db = getFirebaseDb();
  if (!db) throw new Error('Firebase not configured');
  await addDoc(collection(db, 'reviews'), {
    ...payload,
    status: 'challenged',
    created_at: serverTimestamp(),
  });
}

// One subscription per row, client-side partitions by section.
// We intentionally keep this as a single onSnapshot listener per selected row —
// Firestore's SDK can hit an internal target-state race when many listeners are
// torn down and rebuilt in the same render cycle (e.g. per-section listeners).
// Ordering is applied client-side so we don't need a composite index.
export function subscribeToChallengesForRow(
  ticker: string,
  report_date: string,
  onUpdate: (bySection: Record<ChallengeSection, ReviewComment[]>) => void,
): () => void {
  const db = getFirebaseDb();
  if (!db) return () => {};
  const q = query(
    collection(db, 'reviews'),
    where('ticker', '==', ticker),
    where('report_date', '==', report_date),
    where('status', '==', 'challenged'),
    limit(200),
  );
  return onSnapshot(q,
    snap => {
      const all = snap.docs.map(toComment);
      all.sort((a, b) => (b.created_at?.getTime() ?? 0) - (a.created_at?.getTime() ?? 0));
      const bySection: Record<ChallengeSection, ReviewComment[]> = {
        conviction: [],
        drivers:    [],
        pattern:    [],
        eval:       [],
      };
      for (const c of all) {
        if (c.section && bySection[c.section]) bySection[c.section].push(c);
      }
      onUpdate(bySection);
    },
    err => { console.error('challenges subscription failed:', err); },
  );
}

// Listen to every challenge across the app. Used to render "has-challenges" dots
// on the left-panel rows. Returns a map of `${ticker}_${report_date}` → challenge count.
export function subscribeToAllChallengeCounts(
  onUpdate: (counts: Record<string, number>) => void,
): () => void {
  const db = getFirebaseDb();
  if (!db) return () => {};
  const q = query(
    collection(db, 'reviews'),
    where('status', '==', 'challenged'),
    limit(1000),
  );
  return onSnapshot(q,
    snap => {
      const counts: Record<string, number> = {};
      snap.forEach(doc => {
        const d = doc.data();
        if (!d.ticker || !d.report_date) return;
        const key = commentKey(d.ticker, d.report_date);
        counts[key] = (counts[key] || 0) + 1;
      });
      onUpdate(counts);
    },
    err => { console.error('challenge counts subscription failed:', err); },
  );
}
