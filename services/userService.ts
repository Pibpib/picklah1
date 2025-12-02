// services/userService.ts
import {
  doc,
  getDoc,
  onSnapshot,
  collection,
  query,
  where,
  limit,
  getDocs,
} from 'firebase/firestore';
import { db } from './firebaseConfig';

export async function getUserProfile(uid: string) {
  const d = await getDoc(doc(db, 'user_profile', uid));
  return d.exists() ? d.data() : null;
}

/** Legacy helper if you ever migrate to docId === uid */
export async function getUserSubscription(uid: string) {
  const d = await getDoc(doc(db, 'Subscription', uid));
  return d.exists() ? d.data() : null;
}

/** Fetch subscription via userID field (works with random doc IDs) */
export async function getUserSubscriptionByUserId(uid: string) {
  const qRef = query(
    collection(db, 'Subscription'),
    where('userID', '==', uid),
    limit(1)
  );
  const snap = await getDocs(qRef);
  if (snap.empty) return null;
  return snap.docs[0].data();
}

/** Live listener via userID field */
export function listenUserSubscriptionByUserId(
  uid: string,
  cb: (sub: { planType?: string; status?: string } | null) => void
) {
  const qRef = query(
    collection(db, 'Subscription'),
    where('userID', '==', uid),
    limit(1)
  );
  return onSnapshot(qRef, (qs) => {
    if (qs.empty) cb(null);
    else cb(qs.docs[0].data() as any);
  });
}
