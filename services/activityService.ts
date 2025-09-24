import { collection, getDocs } from "firebase/firestore";
import { db } from "./firebaseConfig";

export async function fetchCategories() {
  const querySnapshot = await getDocs(collection(db, "Category"));
  return querySnapshot.docs.map((doc) => ({
    id: doc.id,
    categoryName: doc.data().categoryName,
    accessLevel: doc.data().accessLevel,
  }));
}

export async function fetchActivities() {
  const querySnapshot = await getDocs(collection(db, "Activity"));
  return querySnapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));
}
