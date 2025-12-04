import { doc, getDoc, setDoc, collection, query, where, limit, getDocs, onSnapshot } from "firebase/firestore";
import { db } from "./firebaseConfig";
import Purchases from "react-native-purchases";

// Get user profile
export async function getUserProfile(uid: string) {
  const d = await getDoc(doc(db, "user_profile", uid));
  return d.exists() ? d.data() : null;
}

// Get subscription document by UID
export async function getUserSubscription(uid: string) {
  const d = await getDoc(doc(db, "Subscription", uid));
  return d.exists() ? d.data() : null;
}

// Update subscription from RevenueCat
export async function updateUserSubscriptionStatus(uid: string) {
  try {
    const customerInfo = await Purchases.getCustomerInfo();
    const entitlement = customerInfo.entitlements.active["Premium"];
    const hasPremium = !!entitlement;

    await setDoc(
      doc(db, "Subscription", uid),
      {
        userID: uid,
        planType: hasPremium ? "Premium" : "Free",
        status: hasPremium ? "active" : "inactive",
        lastChecked: new Date(),
        productIdentifier: entitlement?.productIdentifier || null,
        purchaseDate: entitlement?.latestPurchaseDateMillis ? new Date(entitlement.latestPurchaseDateMillis) : null,
        expirationDate: entitlement?.expirationDateMillis ? new Date(entitlement.expirationDateMillis) : null,
      },
      { merge: true }
    );

    return hasPremium;
  } catch (e) {
    console.log("Error updating subscription", e);
    return false;
  }
}

// Listen for RevenueCat updates and update Firebase
export function listenRevenueCatUpdates(uid: string, cb: (isPremium: boolean) => void) {
  const listener = async (customerInfo: any) => {
    const entitlement = customerInfo.entitlements.active["Premium"];
    const hasPremium = !!entitlement;

    await setDoc(
      doc(db, "Subscription", uid),
      {
        userID: uid,
        planType: hasPremium ? "Premium" : "Free",
        status: hasPremium ? "active" : "inactive",
        lastChecked: new Date(),
        productIdentifier: entitlement?.productIdentifier || null,
        purchaseDate: entitlement?.purchaseDateMillis ? new Date(entitlement.purchaseDateMillis) : null,
        expirationDate: entitlement?.expirationDateMillis ? new Date(entitlement.expirationDateMillis) : null,
      },
      { merge: true }
    );

    cb(hasPremium);
  };

  Purchases.addCustomerInfoUpdateListener(listener);

  return () => Purchases.removeCustomerInfoUpdateListener(listener);
}

import RevenueCatUI, { PAYWALL_RESULT } from 'react-native-purchases-ui';

export async function presentPickLahPaywall(): Promise<boolean> {
  try {
    const paywallResult: PAYWALL_RESULT = await RevenueCatUI.presentPaywall();

    switch (paywallResult) {
      case PAYWALL_RESULT.PURCHASED:
      case PAYWALL_RESULT.RESTORED:
        return true;
      case PAYWALL_RESULT.NOT_PRESENTED:
      case PAYWALL_RESULT.ERROR:
      case PAYWALL_RESULT.CANCELLED:
      default:
        return false;
    }
  } catch (e) {
    console.log('Error presenting paywall:', e);
    return false;
  }
}

import { useEffect, useState } from "react";
import { auth, } from "@/services/firebaseConfig";

export function usePremium() {
  const [isPremium, setIsPremium] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const checkSubscription = async () => {
      try {
        const customerInfo = await Purchases.getCustomerInfo();
        const entitlement = customerInfo.entitlements.active["Premium"];
        const hasPremium = !!entitlement;
        setIsPremium(hasPremium);

        if (auth.currentUser) {
          await setDoc(
            doc(db, "Subscription", auth.currentUser.uid),
            {
              userID: auth.currentUser.uid,
              planType: hasPremium ? "Premium" : "Free",
              status: hasPremium ? "active" : "inactive",
              lastChecked: new Date(),
              productIdentifier: entitlement?.productIdentifier || null,
              expirationDate: entitlement?.expirationDate ? new Date(entitlement.expirationDate) : null,
            },
            { merge: true }
          );
        }
      } catch (e) {
        console.error("Error fetching subscription info", e);
      } finally {
        setLoading(false);
      }
    };

    checkSubscription();

    const listener = async (customerInfo: any) => {
      const entitlement = customerInfo.entitlements.active["Premium"];
      const hasPremium = !!entitlement;
      setIsPremium(hasPremium);

      if (auth.currentUser) {
        await setDoc(
          doc(db, "Subscription", auth.currentUser.uid),
          {
            userID: auth.currentUser.uid,
            planType: hasPremium ? "Premium" : "Free",
            status: hasPremium ? "active" : "inactive",
            lastChecked: new Date(),
            productIdentifier: entitlement?.productIdentifier || null,
            purchaseDate: entitlement?.latestPurchaseDateMillis ? new Date(entitlement.latestPurchaseDateMillis) : null,
            expirationDate: entitlement?.expirationDateMillis ? new Date(entitlement.expirationDateMillis) : null,
          },
          { merge: true }
        );
      }
    };

    Purchases.addCustomerInfoUpdateListener(listener);

    return () => {
      Purchases.removeCustomerInfoUpdateListener(listener);
    };
  }, []);

  return { isPremium, loading };
}

export async function syncRevenueCatSubscription(uid: string) {
  try {
    const customerInfo = await Purchases.getCustomerInfo();
    const entitlement = customerInfo.entitlements.active["Premium"];
    const hasPremium = !!entitlement;

    await setDoc(
      doc(db, "Subscription", uid),
      {
        userID: uid,
        planType: hasPremium ? "Premium" : "Free",
        status: hasPremium ? "active" : "inactive",
        lastChecked: new Date(),
        productIdentifier: entitlement?.productIdentifier || null,
        purchaseDate: entitlement?.latestPurchaseDateMillis ? new Date(entitlement.latestPurchaseDateMillis) : null,
        expirationDate: entitlement?.expirationDateMillis ? new Date(entitlement.expirationDateMillis) : null,
      },
      { merge: true }
    );

    return hasPremium;
  } catch (e) {
    console.error("[syncRevenueCatSubscription] Error updating Firestore:", e);
    return false;
  }
}

export function listenToRevenueCat(uid: string, setPlan: (plan: "Free" | "Premium") => void) {
  const listener = async (customerInfo: any) => {
    const entitlement = customerInfo.entitlements.active["Premium"];
    const hasPremium = !!entitlement;

    // Update Firestore
    await syncRevenueCatSubscription(uid);

    // Update local state
    setPlan(hasPremium ? "Premium" : "Free");
  };

  Purchases.addCustomerInfoUpdateListener(listener);

  return () => Purchases.removeCustomerInfoUpdateListener(listener);
}

export type UserPlan = "free" | "premium";

export function listenUserSubscriptionByUserId(
  uid: string,
  cb: (sub: { planType: UserPlan }) => void
) {
  const subDocRef = doc(db, "Subscription", uid);
  const unsubFirestore = onSnapshot(subDocRef, (docSnap) => {
    if (docSnap.exists()) {
      const data = docSnap.data();
      const planType: UserPlan =
        data?.planType?.toLowerCase() === "premium" ? "premium" : "free";
      cb({ planType });
    }
  });

  const listener = async (customerInfo: any) => {
    const entitlement = customerInfo.entitlements.active["Premium"];
    const hasPremium = !!entitlement;

    const planType: UserPlan = hasPremium ? "premium" : "free";

    await setDoc(
      subDocRef,
      {
        userID: uid,
        planType: hasPremium ? "Premium" : "Free",
        status: hasPremium ? "active" : "inactive",
        lastChecked: new Date(),
        productIdentifier: entitlement?.productIdentifier || null,
        purchaseDate: entitlement?.latestPurchaseDateMillis
          ? new Date(entitlement.latestPurchaseDateMillis)
          : null,
        expirationDate: entitlement?.expirationDateMillis
          ? new Date(entitlement.expirationDateMillis)
          : null,
      },
      { merge: true }
    );

    cb({ planType });
  };

  Purchases.addCustomerInfoUpdateListener(listener);

  return () => {
    unsubFirestore();
    Purchases.removeCustomerInfoUpdateListener(listener);
  };
}
