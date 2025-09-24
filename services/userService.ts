import { doc, setDoc, getDoc } from "firebase/firestore";
import { db } from "./firebaseConfig";

export async function saveUserProfile(uid: string, profileData: any) {
  await setDoc(doc(db, "user_profile", uid), profileData);
}

export async function getUserProfile(uid: string) {
  const docSnap = await getDoc(doc(db, "user_profile", uid));
  return docSnap.exists() ? docSnap.data() : null;
}
