import { collection, query, where, doc, setDoc, getDoc, getDocs } from "firebase/firestore";
import { db } from "./firebaseConfig";

export async function saveUserProfile(uid: string, profileData: any) {
  await setDoc(doc(db, "user_profile", uid), profileData);
}

export async function getUserProfile(uid: string) {
  const docSnap = await getDoc(doc(db, "user_profile", uid));
  return docSnap.exists() ? docSnap.data() : null;
}

//subscription
export interface Subscription {
  id: string;
  planType: "premium" | "free";
  renewAt: Date;
  startAt: Date;
  status: string;
  userID: string;
}

export async function getUserSubscription(userId: string): Promise<Subscription | null> {
  try {
    const q = query(
      collection(db, "Subscription"),
      where("userID", "==", userId),
      where("status", "==", "active")
    );
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) return null;

    const doc = querySnapshot.docs[0];
    const data = doc.data();

    return {
      id: doc.id,
      planType: data.planType,
      renewAt: data.renewAt?.toDate() || new Date(),
      startAt: data.startAt?.toDate() || new Date(),
      status: data.status,
      userID: data.userID?.id || "",
    };
  } catch (error) {
    console.error("Error fetching user subscription:", error);
    return null;
  }
}
