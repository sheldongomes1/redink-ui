// Firestore-backed comments for the "Needs Review" flow.
import {
  addDoc, collection, onSnapshot, orderBy, query, serverTimestamp, where,
  type DocumentData, type QueryDocumentSnapshot, type Timestamp,
} from 'firebase/firestore';
import { getFirebaseDb } from './firebase';

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
    created_at:    ts?.toDate ? ts.toDate() : null,
  };
}

export async function saveComment(payload: {
  ticker: string;
  anomaly_score: number;
  report_date: string;
  comment_text: string;
  user_email: string;
  user_name: string;
  user_photo: string | null;
  user_uid: string;
  status: string;
}): Promise<void> {
  const db = getFirebaseDb();
  if (!db) throw new Error('Firebase not configured');
  await addDoc(collection(db, 'reviews'), {
    ...payload,
    created_at: serverTimestamp(),
  });
}

// Subscribe to comments for a single anomaly (ticker + report_date).
// Returns an unsubscribe function.
export function subscribeToComments(
  ticker: string,
  report_date: string,
  onUpdate: (comments: ReviewComment[]) => void,
): () => void {
  const db = getFirebaseDb();
  if (!db) return () => {};
  const q = query(
    collection(db, 'reviews'),
    where('ticker', '==', ticker),
    where('report_date', '==', report_date),
    orderBy('created_at', 'desc'),
  );
  return onSnapshot(q,
    snap => onUpdate(snap.docs.map(toComment)),
    err => { console.error('comments subscription failed:', err); },
  );
}
