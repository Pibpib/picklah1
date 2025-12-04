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

    console.log("[usePlan] Initializing for UID:", uid);

    const updatePlan = async (customerInfo: any) => {
      console.log("[usePlan] CustomerInfo received:", JSON.stringify(customerInfo, null, 2));

      const entitlement = customerInfo.entitlements.active["PickLah Pro"];
      const hasPremium = !!entitlement;

      const newPlan: Plan = hasPremium ? "Premium" : "Free";
      setPlan(newPlan);

      console.log(`[usePlan] Updating Firestore for UID: ${uid}, plan: ${newPlan}`);

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
        console.log("[usePlan] Firestore subscription updated successfully");
      } catch (e) {
        console.error("[usePlan] Error updating Firestore:", e);
      }

      setReady(true);
    };

    // Initialize by fetching current customer info
    const init = async () => {
      try {
        const customerInfo = await Purchases.getCustomerInfo();
        await updatePlan(customerInfo);
      } catch (e) {
        console.error("[usePlan] Error fetching customer info:", e);
      }
    };

    init();

    // Listen to real-time updates from RevenueCat
    Purchases.addCustomerInfoUpdateListener(updatePlan);

    // Cleanup not needed (SDK handles it)
  }, [uid]);

  return { plan, ready, uid };
}
