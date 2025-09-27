import { collection, getDocs } from "firebase/firestore";
import { db } from "./firebaseConfig";

export interface Category {
  id: string;
  categoryName: string;
  accessLevel: string;
}

export interface Mood {
  id: string;
  moodName: string;
  accessLevel: string;
}

export interface Activity {
  id: string;
  name: string;
  mood?: string;
  [key: string]: any;
}

// Fetch categories from Firestore
export async function fetchCategories(): Promise<Category[]> {
  const querySnapshot = await getDocs(collection(db, "Category"));
  return querySnapshot.docs.map((doc) => ({
    id: doc.id,
    categoryName: doc.data().categoryName,
    accessLevel: doc.data().accessLevel,
  }));
}

// Fetch moods from Firestore
export async function fetchMoods(): Promise<Mood[]> {
  const querySnapshot = await getDocs(collection(db, "Mood"));
  return querySnapshot.docs.map((doc) => ({
    id: doc.id,
    moodName: doc.data().moodName,
    accessLevel: doc.data().accessLevel,
  }));
}

// Fetch activities from Firestore
export async function fetchActivities() {
  const querySnapshot = await getDocs(collection(db, "Activity"));
  return querySnapshot.docs.map((doc) => ({
    id: doc.id,
    activityName: doc.data().activityName,
    categoryId: doc.data().categoryId,
    moodId: doc.data().moodId,
  }));
}
