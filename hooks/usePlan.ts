import { useEffect, useState, useCallback } from "react";
import Purchases from "react-native-purchases";
import { doc, setDoc } from "firebase/firestore";
import { db } from "@/services/firebaseConfig";
import type { Plan } from "@/services/plan";

export function usePlan(uid?: string | null) {
  const [plan, setPlan] = useState<Plan>("Free");
  const [ready, setReady] = useState(false);

  const updatePlan = useCallback(
    async (customerInfo: any) => {
      if (!uid) return;

      const entitlement = customerInfo.entitlements.active["PickLah Pro"];
      const hasPremium = !!entitlement;
      const newPlan: Plan = hasPremium ? "Premium" : "Free";

      setPlan(newPlan);

      try {
        await setDoc(
          doc(db, "Subscription", uid),
          {
            userID: uid,
            planType: newPlan,
            status: hasPremium ? "active" : "inactive",
            lastChecked: new Date(),
            productIdentifier: entitlement?.productIdentifier || null,
            purchaseDate: entitlement?.purchaseDate ? new Date(entitlement.purchaseDate) : null,
            expirationDate: entitlement?.expirationDate ? new Date(entitlement.expirationDate) : null,
          },
          { merge: true }
        );
      } catch (e) {
        console.error("[usePlan] Error updating Firestore:", e);
      }

      setReady(true);
    },
    [uid]
  );

  const refreshPlan = useCallback(async () => {
    try {
      const customerInfo = await Purchases.getCustomerInfo();
      await updatePlan(customerInfo);
    } catch (e) {
      console.error("[usePlan] Error refreshing plan:", e);
    }
  }, [updatePlan]);

  useEffect(() => {
    if (!uid) return;

    refreshPlan(); // initial fetch
    Purchases.addCustomerInfoUpdateListener(updatePlan);
  }, [uid, updatePlan, refreshPlan]);

  return { plan, ready, uid, refreshPlan };
}
