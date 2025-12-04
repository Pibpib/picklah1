import { useEffect, useState } from "react";
import Purchases from "react-native-purchases";
import { doc, setDoc } from "firebase/firestore";
import { db } from "@/services/firebaseConfig";
import type { Plan } from "@/services/plan";

export function usePlan(uid?: string | null) {
  const [plan, setPlan] = useState<Plan>("Free");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!uid) {
      console.log("[usePlan] No UID yet");
      return;
    }
    console.log("[usePlan] Running for UID:", uid);

    const updatePlan = async (customerInfo: any) => {
      console.log("[usePlan] CustomerInfo received:", JSON.stringify(customerInfo, null, 2));

      // Check if Premium entitlement is active
      const entitlement = customerInfo.entitlements.active["Premium"];
      const hasPremium = !!entitlement;

      const newPlan: Plan = hasPremium ? "Premium" : "Free";
      setPlan(newPlan);

      console.log(`[usePlan] Updating Firestore subscription for UID: ${uid}, plan: ${newPlan}`);

      try {
        // Upsert subscription in Firestore
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
          { merge: true } // ensures document is created or updated
        );
        console.log("[usePlan] Firestore subscription updated successfully");
      } catch (e) {
        console.error("[usePlan] Error updating Firestore subscription:", e);
      }

      setReady(true);
    };

    const init = async () => {
      console.log("[usePlan] Init called for UID:", uid);
      try {
        const customerInfo = await Purchases.getCustomerInfo();
        await updatePlan(customerInfo);
      } catch (e) {
        console.error("[usePlan] Error fetching customer info:", e);
      }
    };

    init();

    // Listen to real-time RevenueCat updates
    Purchases.addCustomerInfoUpdateListener(updatePlan);
    return () => {
      // Cleanup handled by RevenueCat SDK
    };
  }, [uid]);

  console.log("[usePlan] Returning:", { plan, ready, uid });
  return { plan, ready, uid };
}
