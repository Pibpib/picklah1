// hooks/use-usage.ts
import { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../services/firebaseConfig';
import { listenUsage, ensureUsage, UsageDoc } from '../services/usage';

export function useUsage() {
  const [uid, setUid] = useState<string | null>(null);
  const [usage, setUsage] = useState<UsageDoc>({});
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let unsub: undefined | (() => void);

    const unsubAuth = onAuthStateChanged(auth, async (u) => {
      setUid(u?.uid ?? null);
      setUsage({});
      setReady(false);

      if (!u) { setReady(true); return; }

      await ensureUsage(u.uid); // ensure exists / rotate day
      unsub?.();
      unsub = listenUsage(u.uid, (doc) => { setUsage(doc); setReady(true); });
    });

    return () => { unsubAuth(); unsub?.(); };
  }, []);

  return { uid, usage, ready };
}
