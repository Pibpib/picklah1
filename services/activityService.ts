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
  activityTitle: string;
  createBy: string;
  moodId: string;
  categoryId: string;
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
export async function fetchActivitiesFiltered(
  categoryIds: string[] = [],
  moodIds: string[] = []
): Promise<Activity[]> {
  try {
    const snapshot = await getDocs(collection(db, "Activity"));
    let activities: Activity[] = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        activityTitle: data.activityTitle,
        createBy: data.createBy,
        // Extract the id string from DocumentReference, or fallback to empty string
        moodId: data.moodID?.id || "",
        categoryId: data.categoryID?.id || "",
      };
    });
    console.log("Filtering activities with categories:", categoryIds, "and moods:", moodIds);
    console.log("Total activities before filter:", activities.length);
    // Apply AND filtering (activities must match both selected categories and moods if any)
    if (categoryIds.length > 0) {
      activities = activities.filter((a) => categoryIds.includes(a.categoryId));
    }
    if (moodIds.length > 0) {
      activities = activities.filter((a) => moodIds.includes(a.moodId));
    }
    console.log("Total activities after filter:", activities.length);
    return activities;
  } catch (error) {
    console.error("Error fetching filtered activities:", error);
    return [];
  }
}
