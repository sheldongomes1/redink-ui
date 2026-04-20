// General product feedback — not tied to any ticker or quarter.
// Lives in its own Firestore collection so the triage workflow (reviews) stays
// separate from the backlog workflow (feedback).
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { getFirebaseDb } from './firebase';

export async function saveFeedback(payload: {
  text: string;
  user_email: string;
  user_name: string;
  user_photo: string | null;
  user_uid: string;
}): Promise<void> {
  const db = getFirebaseDb();
  if (!db) throw new Error('Firebase not configured');
  await addDoc(collection(db, 'feedback'), {
    ...payload,
    created_at: serverTimestamp(),
  });
}
