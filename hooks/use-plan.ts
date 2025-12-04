// hooks/use-plan.ts
import { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../services/firebaseConfig';
import { listenUserPlan, Plan } from '../services/plan';

export function usePlan() {
  const [plan, setPlan] = useState<Plan>('Free');
  const [ready, setReady] = useState(false);
  const [uid, setUid] = useState<string | null>(null);

  useEffect(() => {
    let unsubPlan: undefined | (() => void);

    const unsubAuth = onAuthStateChanged(auth, (u) => {
      const newUid = u?.uid ?? null;
      setUid(newUid);

      if (!newUid) {
        setPlan('Free');
        setReady(true);
        unsubPlan?.(); unsubPlan = undefined;
        return;
      }

      unsubPlan?.();
      unsubPlan = listenUserPlan(newUid, (p) => { setPlan(p); setReady(true); });
    });

    return () => { unsubAuth(); unsubPlan?.(); };
  }, []);

  return { plan, ready, uid };
}