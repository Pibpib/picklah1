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
  description?: string;
  activityTitle: string;
  createdBy: string;
  moodIds: string[];
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

      // Handle single or multiple mood references
      let moodIds: string[] = [];
      if (Array.isArray(data.moodID)) {
        moodIds = data.moodID.map((m: any) => m.id); // array of refs
      } else if (data.moodID) {
        moodIds = [data.moodID.id]; // single ref
      }

      return {
        id: doc.id,
        activityTitle: data.activityTitle,
        description: data.description,
        createdBy: data.createdBy,
        moodIds,
        categoryId: data.categoryID?.id || "",
      };
    });

    // Filtering
    if (categoryIds.length > 0) {
      activities = activities.filter((a) => categoryIds.includes(a.categoryId));
    }
    if (moodIds.length > 0) {
      activities = activities.filter((a) =>
        a.moodIds.some((m) => moodIds.includes(m)) //   allow multiple moods
      );
    }

    console.log("Total activities after filter:", activities.length);
    return activities;
  } catch (error) {
    console.error("Error fetching filtered activities:", error);
    return [];
  }
}