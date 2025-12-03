// services/usage.ts
import {
  doc, getDoc, onSnapshot, setDoc, serverTimestamp, updateDoc,
} from 'firebase/firestore';
import { db } from './firebaseConfig';

export type UsageDoc = {
  spinSinceAd?: number;         // spins since last ad
  lastSpinAt?: any;             // Timestamp
  miniCountToday?: number;      // mini game plays today
  miniDateKey?: string;         // 'YYYY-MM-DD' for the day we counted
  updatedAt?: any;
};

const todayKey = () => {
  const d = new Date();
  const m = `${d.getMonth()+1}`.padStart(2,'0');
  const day = `${d.getDate()}`.padStart(2,'0');
  return `${d.getFullYear()}-${m}-${day}`;
};

export function listenUsage(uid: string, cb: (u: UsageDoc) => void) {
  const ref = doc(db, 'Usage', uid);
  return onSnapshot(ref, (snap) => {
    cb((snap.exists() ? (snap.data() as UsageDoc) : {}));
  });
}

export async function ensureUsage(uid: string): Promise<UsageDoc> {
  const ref = doc(db, 'Usage', uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    const fresh: UsageDoc = { spinSinceAd: 0, miniCountToday: 0, miniDateKey: todayKey(), updatedAt: serverTimestamp() };
    await setDoc(ref, fresh, { merge: true });
    return fresh;
  }
  // rotate miniCount if the day changed
  const data = snap.data() as UsageDoc;
  const key = todayKey();
  if (data.miniDateKey !== key) {
    await updateDoc(ref, { miniDateKey: key, miniCountToday: 0, updatedAt: serverTimestamp() });
    return { ...data, miniDateKey: key, miniCountToday: 0 };
  }
  return data;
}

export async function recordSpin(uid: string) {
  const ref = doc(db, 'Usage', uid);
  const cur = await ensureUsage(uid);
  const next = (cur.spinSinceAd ?? 0) + 1;
  await updateDoc(ref, {
    spinSinceAd: next,
    lastSpinAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return next;
}

export async function resetSpinSinceAd(uid: string) {
  const ref = doc(db, 'Usage', uid);
  await updateDoc(ref, { spinSinceAd: 0, updatedAt: serverTimestamp() });
}

export async function canPlayMini(uid: string, freeDailyLimit: number) {
  const u = await ensureUsage(uid);
  return (u.miniCountToday ?? 0) < freeDailyLimit;
}

export async function recordMiniPlay(uid: string) {
  const ref = doc(db, 'Usage', uid);
  const u = await ensureUsage(uid);
  await updateDoc(ref, {
    miniCountToday: (u.miniCountToday ?? 0) + 1,
    updatedAt: serverTimestamp(),
  });
}
