// services/plan.ts
import {
  addDoc,
  collection,
  getDocs,
  limit,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  where,
  doc,
} from 'firebase/firestore';
import { db } from './firebaseConfig';

export type Plan = 'Free' | 'Premium';

function toUiPlan(planType: any): Plan {
  const s = String(planType ?? '').toLowerCase();
  return s === 'premium' ? 'Premium' : 'Free';
}
function toDbPlanType(plan: Plan): 'premium' | 'free' {
  return plan === 'Premium' ? 'premium' : 'free';
}

/** Read once: find Subscription doc where userID == uid */
export async function getUserPlan(uid: string): Promise<Plan> {
  const q = query(collection(db, 'Subscription'), where('userID', '==', uid), limit(1));
  const snap = await getDocs(q);
  if (snap.empty) return 'Free';
  const data = snap.docs[0].data() as any;
  return toUiPlan(data.planType);
}

/** Live listener by userID */
export function listenUserPlan(uid: string, cb: (plan: Plan) => void) {
  const q = query(collection(db, 'Subscription'), where('userID', '==', uid), limit(1));
  return onSnapshot(q, (snap) => {
    if (snap.empty) { cb('Free'); return; }
    const data = snap.docs[0].data() as any;
    cb(toUiPlan(data.planType));
  });
}

/** Upsert: if a Subscription doc exists (userID==uid) update it; else create one */
export async function setUserPlan(uid: string, plan: Plan, source: 'manual'|'iap' = 'manual') {
  const q = query(collection(db, 'Subscription'), where('userID', '==', uid), limit(1));
  const snap = await getDocs(q);

  const payload = {
    userID: uid,
    planType: toDbPlanType(plan),
    status: 'active',
    source,
    updatedAt: serverTimestamp(),
    startAt: serverTimestamp(), // keeps your shape similar
  };

  if (snap.empty) {
    await addDoc(collection(db, 'Subscription'), payload);
  } else {
    await setDoc(doc(db, 'Subscription', snap.docs[0].id), payload, { merge: true });
  }
}
